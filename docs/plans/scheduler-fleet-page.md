---
type: plan
---

# Plan: the Buses page becomes Fleet, for every vehicle type

## Goal

The scheduler holds coaches, minibuses, vans and cars in one Fleet page, and
every screen names a vehicle by its own type, so a van reads "Van 12" and
never "Bus Van".

## Decisions

- **Four types, a fixed list in `scheduler/data.js`:** Coach, Minibus, Van
  and Car / SUV, stored as `Coach`, `Minibus`, `Van` and `Car`, since rux-ui's
  type select already stores `Car`. `buses.type` is free text, so no schema
  change.
- **Motorcoach becomes Coach.** The two Motorcoach rows are the same Prevost
  as the Coach rows, and the editor turns them into Coach on save anyway.
- **One label function names a vehicle everywhere:** the type, then the
  number, as "Coach 218" or "Van 12", and "Vehicle 218" when the type is
  empty. It replaces every hand-built "Bus ${number}" on the Fleet page, the
  board's rows, the trip editor, the Drivers page and trip history.
- **Page and words say Fleet and vehicle:** the side nav and heading say
  Fleet, the button says New vehicle, the field says Number, the trip
  editor's tiles say Vehicle 1 and its count says Vehicles needed.
- **The file becomes `scheduler/fleet.html` and `fleet.js`,** with the nav in
  every scheduler page pointing there; `buses.html` stays as a page that only
  forwards to it, so a saved bookmark still works.
- **The table keeps its name, `buses`,** because rux-ui writes it too.
- **One form for every type.** A van leaves Sleeper and ADA lift unticked.
- **No type filter.** The row already shows the type, and search finds it.
- **Each type has its own icon on the list's disc and the board's row:** the
  bus for Coach and Minibus, Material's `airport_shuttle` for Van and
  `directions_car` for Car.
- **The fleet is ordered by type, then model year newest first,** so the
  board lists the coaches together and a van never sits between two of them.
  The order still lands in `buses.sort_order`, which the Buses page plan
  explains.
- **rux-ui gets a Minibus option** in its type select, so saving a minibus
  there keeps its type. Its other screens keep saying bus.
- **Printed customer text keeps "Bus"**: the policies and the quote are the
  company's own wording, and changing them is a separate decision.

## Questions

- What number should the van have? Its number today is the word "Van".

## Tasks

- [ ] Change the two Motorcoach rows to Coach, and the van's number to the
      answer above, through the Supabase connection, shown to rux first.
- [ ] Add the type list and the label function to `scheduler/data.js`, and
      use them wherever a vehicle is named.
- [ ] Rename the page to `fleet.html` and `fleet.js`, change its words,
      leave `buses.html` forwarding, and point every page's nav at Fleet.
- [ ] Add the van and car icons to Design's icon map and run the full check.
- [ ] Order the fleet by type, then year, on the page and in `sort_order`.
- [ ] Add Minibus to rux-ui's type select.
- [ ] Update `scheduler/docs/screen-inventory.md` and
      `scheduler/docs/database-inventory.md` to the new words and types.
