---
type: plan
---

# Plan: the Buses page becomes Fleet, with types the office edits

## Goal

The scheduler holds any kind of vehicle in one Fleet page, from a list of
types the office edits itself, and every screen names a vehicle by its own
type, so a van reads "Van 12" and never "Bus Van". A business with other
vehicles adds its types without a code change.

## Decisions

- **The office edits the type list,** because a fixed list needs a code
  change for every new kind of business. It is one `settings` row,
  `vehicle-types-v1`, as the requirements list is `requirements-v1`, so there
  is no schema change: `buses.type` and `trips.vehicle_type` stay free text
  holding a type's name.
- **The list starts with four types:** Coach, Minibus, Van and Car / SUV,
  with Car / SUV stored as `Car`, since rux-ui's type select already stores
  `Car`.
- **Each type is a name and an icon,** the icon picked from a fixed set of
  drawings: bus, shuttle, car, truck and trailer. A type with no icon shows
  its initial, as a requirement the app has no drawing for does.
- **The list is edited in a Vehicle types modal** opened from the Fleet page's
  toolbar, since the scheduler has no Settings page yet: a contained list
  with an Add row, and each row's menu holding Rename, Move up, Move down and
  Remove. When a Settings page is built, the list moves there.
- **Renaming a type renames it on every vehicle and trip** that carries it,
  in the same save, so no vehicle is left holding a name the list lost.
- **A type in use cannot be removed;** Remove says how many vehicles hold it.
- **The editor's Type select lists the office's types,** plus the vehicle's
  own type when the list lacks it, so opening a vehicle never changes it.
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
- **The list's disc and the board's row wear the type's icon.**
- **The fleet is ordered by type in the list's order, then model year newest
  first,** so the board lists the coaches together and a van never sits
  between two of them. The order still lands in `buses.sort_order`, which
  the Buses page plan explains.
- **rux-ui's type select reads the same list,** so saving a vehicle there
  never changes its type. Its other screens keep saying bus.
- **Printed customer text keeps "Bus"**: the policies and the quote are the
  company's own wording, and changing them is a separate decision.
- **Only vehicle types are made general here.** Other words tied to one
  business, such as trip, driver and the requirements list's defaults, wait
  for a plan of their own.

## Questions

- What number should the van have? Its number today is the word "Van".

## Tasks

- [ ] Change the two Motorcoach rows to Coach, and the van's number to the
      answer above, through the Supabase connection, shown to rux first.
- [ ] Write the `vehicle-types-v1` row with the four starting types, through
      the Supabase connection, shown to rux first.
- [ ] Load the type list and add the label function in `scheduler/data.js`,
      and use them wherever a vehicle is named.
- [ ] Build the Vehicle types modal, with rename carried to vehicles and trips
      and removal blocked while a type is in use.
- [ ] Rename the page to `fleet.html` and `fleet.js`, change its words,
      leave `buses.html` forwarding, and point every page's nav at Fleet.
- [ ] Add the shuttle, car, truck and trailer icons to Design's icon map and
      run the full check.
- [ ] Order the fleet by type, then year, on the page and in `sort_order`.
- [ ] Make rux-ui's type select read `vehicle-types-v1`, after reading its
      own `CLAUDE.md`.
- [ ] Update `scheduler/docs/screen-inventory.md` and
      `scheduler/docs/database-inventory.md` to the new words and types.
