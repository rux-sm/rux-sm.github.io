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
  drawings: bus, shuttle, car and truck, the Material drawings Design pairs
  with a Carbon icon; Carbon has no trailer. A type with no icon shows
  its initial, as a requirement the app has no drawing for does.
- **The list is edited in a Vehicle types modal** opened from the Fleet page's
  toolbar, since the scheduler has no Settings page yet: a row per type with
  its name and drawing typed in place, buttons to move it up or down or
  remove it, and Add type under them. When a Settings page is built, the list moves there.
- **Renaming a type renames it on every vehicle and trip** that carries it,
  in the same save, so no vehicle is left holding a name the list lost.
- **A type in use cannot be removed;** Remove says how many vehicles hold it.
- **The editor's Type select lists the office's types,** plus the vehicle's
  own type when the list lacks it, so opening a vehicle never changes it.
- **One label function names a vehicle everywhere:** the type, then the
  number, as "Coach 218" or "Van 12", and "Unit 218" when the type is
  empty. It replaces every hand-built "Bus ${number}" that names one vehicle:
  the Fleet page, the board's rows, the trip editor, the Drivers page and
  trip history.
- **A number that repeats its type is shown once,** so the van, whose number
  is "Van" until it is given one, reads "Van". `buses.number` cannot be
  empty.
- **The Fleet page says unit; the board and trip editor say bus** for the
  seat a trip needs filled, as "Bus 1" and "Buses needed", which is the
  office's word for it.
- **The file becomes `scheduler/fleet.html` and `fleet.js`,** with the nav in
  every scheduler page pointing there; `buses.html` stays as a page that only
  forwards to it, so a saved bookmark still works.
- **The table keeps its name, `buses`,** because rux-ui writes it too.
- **One form for every type.** A van leaves Sleeper and ADA lift unticked.
- **No type filter.** The row already shows the type, and search finds it.
- **The list's disc wears the type's icon.** The board's row does not, since
  an icon under the number would set every row's height.
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

None open.

## Tasks

- [ ] Make rux-ui's type select read `vehicle-types-v1`, after reading its
      own `CLAUDE.md`.
