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
  `/fleet/reports/vehicles/fuel-energy`, over each bus's last 90 days, since
  the live stats give only the fuel percent.
- **Each bus's tank is `buses.tank_gallons`, from its maker's sheet:** 222
  on a Prevost H3-45, every active bus; worked out from Samsara's
  fuel percent it came out between 197 and 417 on the same model, so a tank
  is never guessed. A bus with none draws no tick.
- **Miles per gallon are kept, not asked for on every load:** each bus's, with
  when they were worked out, in `bus_fuel_profiles`, which `samsara-fuel`
  refreshes once a night, since a 90-day report is too slow to read each
  minute.
- **The tick is the bus column's alone;** the trip's Buses tab and its tip
  say the same in words.

## Questions

None open.

## Tasks

- [ ] Deploy `scheduler/samsara-fuel/`, run it once with `{"write": false}`
  and then to keep, and schedule it each night, each on rux's yes.
- [ ] A Tank field on the Fleet editor, so a bus of another make gets its
  `tank_gallons`.
- [ ] Work out each bus's next leg and its miles where the board loads its
  trips, and the needed share from them.
- [ ] Draw the tick on the fuel meter in `scheduler/bus-head.js`, amber
  short of it, with the needed miles and gallons on the number's tip.
- [ ] Tests in `scheduler/tools/check-bar.mjs` for the tick's place, short
  and enough, and a leg with no miles.
