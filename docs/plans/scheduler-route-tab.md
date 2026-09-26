---
type: plan
---

# Plan: a simple Route tab in the trip editor

## Goal

The Route tab asks six things and works out the rest: where the group is
picked up and its address, where it is dropped off and its address, and the
two times the group moves. From those it works out when the bus reaches the
pickup and both yard times. rux-ui's Itinerary tab follows it, so both apps
describe a route the same way and show the same times; that change is planned
in rux-ui's own `docs/itinerary-simplify-plan.md`.

## Decisions

- **Six fields are typed, in one section:** Pickup location and Pickup
  address, then Drop-off location and Drop-off address, each location being a
  name anyone would recognise the place by; then Group departs and Group
  arrives. Nothing else is typed.
- **The drop-off address defaults to the pickup address,** because most trips
  come back where they started. It is a real field on every trip, not one that
  appears for some, so the tab has one shape; changing the trip type changes
  no fields.
- **The labels name who is moving,** which is also the rule for which fields
  are typed: the group's two times are typed, and the bus's three are worked
  out, so the form says which is which without a word of explanation.

  | | |
  | :--- | :--- |
  | Yard depart | worked out |
  | Bus arrives | worked out |
  | Group departs | typed |
  | Group arrives | typed |
  | Yard return | worked out |

- **Bus arrives is Group departs less 15 minutes;** yard depart is Bus arrives
  less the drive from the yard; yard return is Group arrives plus the drive
  back from the drop-off. A Times section lists the day in that order with
  what each time came from.
- **The padding is fixed at 15 minutes and is not stored.** The field that
  changed it goes, so a trip wanting longer cannot say so; that is the price
  of the simpler tab, and the Times section shows what was assumed.
- **The drives come from Mapbox and are not editable.** The address fields
  suggest places from Mapbox's Search Box, and a pick asks Mapbox Directions
  for the drive to the pickup and from the drop-off, against the
  `yard-location-v1` settings row with the token in `mapbox-token-v1`. A
  lookup that fails leaves the yard times blank and says so, rather than
  offering a box to type a drive into.
- **A drop-off equal to the pickup writes no drop-off,** because that is what
  a round trip already stores. The field is always on screen and defaults to
  the pickup, but `routePlan` still asks whether the two places differ before
  it writes a drop-off row, so a round trip's rows stay byte for byte what
  they are today and rux-ui reads them unchanged. Without this the new
  default would give every round trip a stop row it never had.
- **The times keep living in the rows rux-ui reads,** so neither board has to
  change: the leg's `pickup` stop holds the pickup place, the drive from the
  yard, `spot` for Bus arrives and `depart_prev` for Yard depart; the first
  `stop` after it holds `depart_prev` for Group departs; the last `stop`
  before the return holds the drop-off place and `arrive` for Group arrives;
  the last `return` stop, the yard, holds `arrive` for Yard return and the
  drive back. Each time keeps its `_date`.
- **A trip rux-ui built a full itinerary for keeps every stop.** The tab
  writes only the rows above and says how many stops the leg has, so nothing
  in between is lost by opening it here, and the Times section shows only the
  five. Whether those stops are shown here, and what else the tab asks for the
  middle of a trip, is the Full itinerary line beneath the Route tab's fields.
- **A drop-off and pick-up trip shows the fields for the leg its bar is,** as
  the tab does today.
- **`trips.departure_time`, `spot_time` and `return_time` are still not
  written,** because rux-ui does not write them.
- **The connector follows.** Once the fields exist, `pickup_address`,
  `departure_time` and `return_time` fill in rather than printing in the
  editor's notice, and a pickup name and drop-off address join the list a
  draft may carry. `scheduler/docs/database-inventory.md` section 5 and
  `scheduler/docs/working-from-claude.md` change in the same commit.

## Questions

None open.

## Tasks

- [ ] rux redeploys the connector, so Claude may send the route's four names.
