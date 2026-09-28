---
type: plan
---

# Plan: the Buses tab, one card per vehicle

## Goal

Each vehicle on a trip carries its own needs and its own type, so one trip can
send a coach with a lift beside a 56-seat coach, or a coach beside a van. The
tab reads as the Route tab does: one short tile per vehicle that opens a window
with its fields, and Add vehicle in place of the Buses needed count.

## Decisions

- **A tile per vehicle, tapped to edit,** as the Route tab's stops are. The tile
  shows the vehicle, then each driver with their status and any warning in
  words; its window holds the type, the needs, the vehicle, the drivers, the
  reliefs, the swap time and the note.
- **Equipment is one list the office keeps,** the vehicle entries of the
  requirements list: Sleeper, ADA Lift, Wi-Fi, Outlets and any added later.
  Each vehicle has a switch per entry on the Fleet page, and each vehicle on a
  trip can ask for any entry. 56 Pax stays worked out from the vehicle's seats.
- **Each vehicle on a trip has its own needs and type,** Any by default. The
  picker lists every active vehicle of every type, vans with coaches, and warns
  when the one picked lacks a need or is the wrong type.
- **They are stored on the vehicle's own `trip_assignments` row,** in new
  columns for its needs and its type, and a vehicle with needs but no bus yet
  keeps its row with no bus, as a cleared one does now.
- **rux-ui saves buses as the scheduler does:** by row id, updating and adding
  rows instead of deleting and rewriting them, and keeping a row with needs and
  no bus. Until it does, a save there would drop every vehicle's needs.
- **Equipment on a vehicle keeps its old home for the first two:** `sleeper`
  and `ada_lift` stay where those live, because rux-ui and the print pages
  read them, and a new `buses.equipment` holds every other entry by its id.
- **The trip-wide columns keep working:** on save, `req_sleeper`, `req_ada`,
  `req_56pax` and `trip_reqs` hold every need any vehicle has, and
  `vehicle_type` holds the type when every vehicle wants the same one.
- **The count goes.** Add vehicle ends each leg's list and a tile's menu
  removes one; `bus_count` and `return_bus_count` still hold how many there are.
- **A split trip's legs are headings over their vehicles,** Drop-off and
  Pickup, as the Route tab heads its stops with days.
- **Hotel and Fuel card leave this tab** for Billing and the Route's miles, as
  `scheduler-hotel-and-fuel-card.md` plans.
- **Each database change is its own step:** the SQL is shown to rux and applied
  as a named migration before any code that writes the new columns is pushed.

## Questions

None open.

## Tasks

- [ ] Change rux-ui's trip save to update `trip_assignments` by id and keep a
  row with needs and no bus, after reading its `CLAUDE.md`.
- [ ] Read and write each vehicle's needs and type in the Buses tab's model,
  and set the trip-wide columns from them on save.
- [ ] Draw the tab: the legs as headings, a tile per vehicle, its window, Add
  vehicle, and Remove on the tile's menu.
- [ ] Let the picker offer every active vehicle and warn per vehicle.
- [ ] Judge the bar's misfit edge and the card's needs per vehicle.
- [ ] Give a draft's trip-wide needs to its first vehicle.
- [ ] Update `scheduler/docs/screen-inventory.md` and
  `scheduler/docs/database-inventory.md`.
- [ ] Check it in Chrome on :8641 on a one-bus trip, a six-bus trip, a split
  trip and a trip with relief drivers.
