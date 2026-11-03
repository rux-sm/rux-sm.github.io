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

- **The tick is the next leg's miles as a share of the tank's range, and a
  15% reserve on top:** the miles over the bus's miles per gallon, over its
  tank's gallons, plus 15 points, so a bus that would finish its trip with
  less than 15% of its tank left is short. The meter
  stays grey at or past the tick and turns amber short of it; red stays the
  fixed critical mark at 10%.
- **The trip measured is the bus's next leg leaving the yard within 24
  hours;** a bus with none draws no tick, since a tank filled before a later
  trip says nothing yet.
- **A leg's miles are the ones the quote already reads,** its route's stop
  miles with the drive out and back, or the trip's estimated miles on a trip
  of one leg; a leg with no miles draws no tick. 300 of the 410 trips with a
  bus and a route have miles. On a trip with a fuel card only the first
  day's miles count, the drive out and the stops dated that day, since the
  driver fills up on the road.
- **Miles per gallon come from Samsara,** the vehicle fuel and energy report,
  `/fleet/reports/vehicles/fuel-energy`, averaged over each bus's last 90
  days, fetched by an Edge Function beside `scheduler/samsara-now/`, since
  the live stats give only the fuel percent.
- **Each bus's tank size is worked out from Samsara, never typed:** over a
  stretch with no fill-up, where the fuel percent only falls, the gallons
  the fuel and energy report says were burned over the points the percent
  fell give the tank's gallons, a rise of 3 points or more ending a stretch
  as a fill-up. The median over the last 90 days' stretches of at least 20
  points stands, and a bus with fewer than three such stretches draws no
  tick, since one stretch alone can be a third off. Samsara keeps a fuel
  percent only where it changes, about 220 a bus in 90 days.
- **The two figures are kept, not asked for on every load:** each bus's
  miles per gallon and tank gallons, with when they were worked out, in a
  table the Edge Function refreshes once a day, since a 90-day history is
  too slow and too costly to read each minute.
- **The tick is the bus column's alone;** the trip's Buses tab and its tip
  say the same in words.

## Questions

None open.

## Tasks

- [ ] Add the table for each bus's miles per gallon and tank gallons, as a
  database change shown to rux and applied on a yes.
- [ ] A new Edge Function that works both out for every bus and keeps them,
  run once a day.
- [ ] Work out each bus's next leg and its miles where the board loads its
  trips, and the needed share from them.
- [ ] Draw the tick on the fuel meter in `scheduler/bus-head.js`, amber
  short of it, with the needed miles and gallons on the number's tip.
- [ ] Tests in `scheduler/tools/check-bar.mjs` for the tick's place, short
  and enough, and a leg with no miles.
