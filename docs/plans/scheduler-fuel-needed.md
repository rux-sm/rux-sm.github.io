---
type: plan
---

# Plan: Fuel needed

## Goal

The bus column's fuel meter carries a tick for the fuel the bus's next trip
needs, and the meter turns amber when the tank is short of it, so the office
sees a bus that will not make its next trip on its tank before it leaves the
yard, where a fixed 25% low mark says nothing about the job.

## Decisions

- **The tick is the next leg's miles as a share of the tank's range:** the
  miles over the bus's miles per gallon, over its tank's gallons. The meter
  stays grey at or past the tick and turns amber short of it; red stays the
  fixed critical mark at 10%.
- **A leg's miles are the ones the quote already reads,** its route's stop
  miles with the drive out and back, or the trip's estimated miles on a trip
  of one leg; a leg with no miles draws no tick. 300 of the 410 trips with a
  bus and a route have miles.
- **Miles per gallon come from Samsara,** the vehicle fuel and energy report,
  `/fleet/reports/vehicles/fuel-energy`, averaged over each bus's last 90
  days, fetched by an Edge Function beside `scheduler/samsara-now/`, since
  the live stats give only the fuel percent.
- **The tick is the bus column's alone;** the trip's Buses tab and its tip
  say the same in words.

## Questions

- Where does each bus's tank size come from: typed once per bus on the
  Fleet page, a new `buses.tank_gallons`, or worked out from Samsara's fuel
  used against the fall in its fuel percent between fill-ups?
- Which trip is next: the bus's next leg that has not left the yard, or only
  one that leaves within the next 24 hours?
- Does a trip with a fuel card count only to its first day's end, since the
  driver fills up on the road, or the whole leg like any other?
- How much spare should the tank keep past the trip: none, or a reserve such
  as 15% of the tank?

## Tasks

- [ ] Fetch each bus's 90-day miles per gallon from Samsara's fuel and
  energy report in a new Edge Function, and check it against one bus's
  report in Samsara's dashboard.
- [ ] Add the tank size the answered question chooses, as a database change
  shown to rux and applied on a yes.
- [ ] Work out each bus's next leg and its miles where the board loads its
  trips, and the needed share from them.
- [ ] Draw the tick on the fuel meter in `scheduler/bus-head.js`, amber
  short of it, with the needed miles and gallons on the number's tip.
- [ ] Tests in `scheduler/tools/check-bar.mjs` for the tick's place, short
  and enough, and a leg with no miles.
