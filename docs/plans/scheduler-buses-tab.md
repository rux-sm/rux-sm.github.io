---
type: plan
---

# Plan: the Buses tab, one card per vehicle

## Goal

Each vehicle on a trip carries its own needs and its own type, so one trip can
send a coach with a lift beside a 56-seat coach, or a coach beside a van. The
tab reads as the Route tab does: one short tile per vehicle, tapped to edit,
with Add vehicle in place of the Buses needed count.

## Decisions

- **The vehicle needs move from the trip to each vehicle:** Sleeper, 56 Pax,
  ADA Lift and Wi-Fi, the entries the office's requirements list types as
  vehicle needs. Each vehicle also has the type it should be, Any by default.
- **The picker lists every active vehicle of every type,** vans with coaches,
  and warns when the one picked lacks a need or is the wrong type, as it warns
  today against the trip's needs.
- **They are stored on the trip, in a new column `trips.bus_needs`,** one list
  per leg in the order of the vehicles, because rux-ui deletes and rewrites a
  trip's `trip_assignments` rows on every save and keeps no row for a vehicle
  not yet chosen.
- **The trip-wide columns keep working:** on save, `req_sleeper`, `req_ada`,
  `req_56pax` and `trip_reqs` hold every need any vehicle has, and
  `vehicle_type` holds the type when every vehicle wants the same one, so
  rux-ui, the print and share pages and the connector read what they read now.
- **The count goes.** Add vehicle ends each leg's list and a tile's menu
  removes one; `bus_count` and `return_bus_count` still hold how many there are.
- **A split trip's legs are headings over their vehicles,** Drop-off and
  Pickup, as the Route tab heads its stops with days.
- **The database change is its own step:** the SQL is shown to rux and applied
  as a named migration before any code that writes the column is pushed.

## Questions

1. **Layout.** A tile per vehicle that opens a window with its fields (the
   Route tab's way), or the fields in rows edited in place? The first is
   recommended.
2. **Hotel and Fuel card.** They are about the drivers and are tracked per leg.
   Do they stay once for the whole trip, at the top of the tab, or go on each
   vehicle?
3. **Wi-Fi.** Vehicles have no Wi-Fi setting, so nothing can check it. Add a
   Wi-Fi switch to each vehicle on the Fleet page?
4. **rux-ui.** Saving a trip there can put its vehicles in a new order, which
   would give each one another's needs. Are trips' buses still changed in
   rux-ui, or only on the board and in the scheduler?

## Tasks

- [ ] Write the migration that adds `trips.bus_needs`, show it to rux, and
  apply it on a yes.
- [ ] Read and write each vehicle's needs and type in the Buses tab's model,
  and set the trip-wide columns from them on save.
- [ ] Draw the tab as the chosen layout: the legs as headings, a tile or row
  per vehicle, Add vehicle, and Remove on the tile's menu.
- [ ] Let the picker offer every active vehicle and warn per vehicle.
- [ ] Judge the bar's misfit edge and the card's needs per vehicle.
- [ ] Give a draft's trip-wide needs to its first vehicle.
- [ ] Update `scheduler/docs/screen-inventory.md` and
  `scheduler/docs/database-inventory.md`.
- [ ] Check it in Chrome on :8641 on a one-bus trip, a six-bus trip, a split
  trip and a trip with relief drivers.
