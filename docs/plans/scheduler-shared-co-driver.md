---
type: plan
---

# Plan: One co-driver for several buses of a trip

## Goal

A co-driver who moves between a trip's buses, giving each driver a break, is
put on every bus they ride. They show on each of those buses, are paid
once, get one set of papers and one reminder, and see the trip once on
their schedule. The live board knows they may be in any of those buses, so
it never calls that the wrong bus.

## Decisions

- **Only the co-driver seat can ride more than one bus,** and only buses of
  the same trip and leg. The driver seat and the relief seats stay one bus
  each.
- **The co-driver keeps one `trip_drivers` row, on the bus they start in,
  and the other buses they ride in its `also_on` column,** a list of
  `trip_assignments` ids that the database keeps to the same trip and leg,
  and tidies when a bus is deleted, moved or given to a partner. One row per
  bus was rejected because pay, papers, reminders, status, the to-do list,
  the driver's schedule and the connector all count rows; a table beside it
  was rejected because a second link between buses and driver rows makes
  every read of a bus's drivers ambiguous. "Covers" stays the word for a
  partner's bus; this is "also on".
- **Paid once:** the one row's pay. Papers, the reminder, the status and
  every to-do are the one row's, as they are now.
- **Every bus they ride shows their name in its co-driver seat.** A bus
  they ride has no co-driver of its own.
- **Live, the bus Samsara has them in shows them as now; the other buses
  they ride say which bus they are in, in a quiet colour,** not red Wrong
  bus. Wrong bus stays for a bus outside the ones they ride.
- **Samsara confirms them** when it has them in any bus they ride, as it
  does for their own bus.
- **The vehicle window sets the buses ridden,** Also rides under the
  co-driver's seat, a tag for each of the leg's other buses; the clash checks
  need no change, since the co-driver has no row on a bus they ride.
- **One set of papers names every bus they ride,** and so do the driver's
  job page and schedule.
- **The customer is billed one Second driver for the co-driver,** however
  many buses they ride, as they are one person working the trip.

## Questions

- None open.

## Tasks

- [ ] The driver's own page: `get_driver_share_trips` returns each seat's
  `also_on`, so the driver's job there names every bus they ride; applied
  on rux's yes.
- [ ] Deploy `scheduler-connector`, so `get_trip` lists the buses a
  co-driver rides; on rux's yes.
