---
type: plan
---

# Plan: One co-driver for several buses of a trip

## Goal

A co-driver who moves between a trip's buses, giving each driver a break, is
put on every bus they cover. They show on each of those buses, are paid
once, get one set of papers and one reminder, and see the trip once on
their schedule. The live board knows they may be in any of those buses, so
it never calls that the wrong bus.

## Decisions

- **Only the co-driver seat can cover more than one bus,** and only buses of
  the same trip and leg. The driver seat and the relief seats stay one bus
  each.
- **The co-driver keeps one `trip_drivers` row, on the bus they start in,
  and a list of the other buses they cover,** in a new table
  `trip_driver_covers` (`trip_driver_id`, `assignment_id`, each removed with
  its row or bus). One row per bus was rejected because pay, papers,
  reminders, status, the to-do list, the driver's schedule and the connector
  all count rows, about twenty places, and each would need its own fix and
  every new one would too.
- **Paid once:** the one row's pay. Papers, the reminder, the status and
  every to-do are the one row's, as they are now.
- **Every bus they cover shows their name in its co-driver seat.** A bus
  they cover has no co-driver of its own.
- **Live, the bus Samsara has them in shows them as now; the other buses
  they cover say which bus they are in, in a quiet colour,** not red Wrong
  bus. Wrong bus stays for a bus outside the ones they cover.
- **Samsara confirms them** when it has them in any bus they cover, as it
  does for their own bus.
- **The co-driver seat's menu sets the buses covered,** a check for each of
  the leg's other buses; the clash checks pass over the buses of the same
  trip and leg that the driver covers.
- **One set of papers names every bus they cover,** and so do the driver's
  job page and schedule.
- **The customer is billed one Second driver for the co-driver,** however
  many buses they cover, as they are one person working the trip.

## Questions

- None open.

## Tasks

- [ ] Database: create `trip_driver_covers`, staff-only like `trip_drivers`,
  with the grants checked as `docs/database-access.md` says; applied on
  rux's yes.
- [ ] Read the covers with each trip in `scheduler/data.js`'s trip columns,
  and add one helper for who sits on a bus, its own rows and the co-driver
  covering it, used by the bar, the print week card and `road-bar.js`.
- [ ] Seating: the co-driver seat's Covers checks in the editor and the seat
  menu; `fitFor`, `rosterClash` and `fleetDuplicates` pass over a covered
  bus; a covered bus's own co-driver seat is taken.
- [ ] Live: `live-trip.js`'s Wrong bus and `road-bar.js`'s crew read the
  covered buses; `confirmFromSamsara` confirms from any of them.
- [ ] Papers and the driver: the envelope, itinerary, HOS form,
  `driver-job.js` and the schedule name every bus covered.
- [ ] Billing: the Second driver quantity counts a co-driver once, not each
  bus they cover.
- [ ] Connector: `get_trip` lists the covered buses beside the co-driver.
- [ ] Departures and to-do: a covered bus shows the co-driver's name, with
  their tasks only on their own bus.
- [ ] Checks: a shared co-driver case in `check-live-trip.mjs` and the clash
  checks, a sample on the components page, and the screen inventory's
  crew and Wrong bus lines.
