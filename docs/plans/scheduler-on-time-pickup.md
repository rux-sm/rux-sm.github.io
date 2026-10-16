---
type: plan
---

# Plan: On-time pickup

## Goal

A driver whose bus reaches its pickup on time earns $20, and the scheduler
says which buses did. Each bus's arrival at its pickup is kept, read from
Samsara's GPS history, so a trip nobody watched live still has one, and the
office sees it on the trip and where it adds up driver pay.

## Decisions

- **On time is within a quarter mile of the pickup at or before its Spot
  time,** or the leg's departure where it has no Spot; the arrival is the
  start of the stay there, as `scheduler/samsara-miles/handler.ts` reads it.
- **The arrival is kept on each bus's row of the leg,** a new
  `trip_assignments.pickup_at`; whether it was on time is worked out from it
  and the Spot, never stored, so a corrected Spot corrects it.
- **The arrival is fetched from Samsara after the leg,** by the Billing tab's
  Get from Samsara, which already fetches the miles, through
  `samsara-miles`, which gains the bus's GPS history across the pickup.
- **The $20 goes to the Driver seat,** the driver in the pickup's seat, and
  not to a co-driver or a relief.
- **Every driver is paid by the trip,** so each seat's pay is typed on the
  Billing tab's Driver pay, and a trip that is back is not closed until every
  filled seat has one.
- **The trip's card says it while the bus is out:** the pickup's arrival with
  on time in green, or the minutes late in amber, from the live trail.
- **The database change is its own step,** SQL shown to rux and applied on
  his yes before the code that reads it is pushed.

## Questions

- Is a quarter mile right? Trips 100074, 100907 and 100908 come out late or
  with no arrival, which a map pin away from where the buses wait would also
  give; their GPS is too old to look at beside the pin.
- Where is driver pay added up once rux-ui is retired: a pay list on the
  Drivers page for a pay period, or a column in the trip export?

## Tasks

- [ ] Show the pickup's arrival on the trip's card while the bus is out, on
  time in green or the minutes late in amber, from the live trail.
- [ ] Fill the arrival for the trips since the start of the pay period rux
  names, read-only first, written on his yes.
- [ ] Add the $20 where driver pay is added up, once the question is answered.
