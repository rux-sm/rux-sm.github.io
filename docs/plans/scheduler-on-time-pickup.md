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
  time,** or the leg's departure where it has no Spot, the same reach rule
  the board's live line uses in `scheduler/road.js`.
- **The arrival is kept on each bus's row of the leg,** a new
  `trip_assignments.pickup_at`; whether it was on time is worked out from it
  and the Spot, never stored, so a corrected Spot corrects it.
- **The arrival is fetched from Samsara after the leg,** by the Billing tab's
  Get from Samsara, which already fetches the miles, through
  `samsara-miles`, which gains the bus's GPS history across the pickup.
- **The $20 goes to the Driver seat,** the driver in the pickup's seat, and
  not to a co-driver or a relief.
- **The trip's card says it while the bus is out:** the pickup's arrival with
  on time in green, or the minutes late in amber, from the live trail.
- **The database change is its own step,** SQL shown to rux and applied on
  his yes before the code that reads it is pushed.

## Questions

- Where is driver pay added up once rux-ui is retired: a pay list on the
  Drivers page for a pay period, or a column in the trip export?

## Tasks

- [ ] Add `trip_assignments.pickup_at`, shown to rux and applied on his yes,
  and its row in `scheduler/docs/database-inventory.md`.
- [ ] Teach `samsara-miles` to answer each bus's pickup arrival from its GPS
  history, with sample cases in `scheduler/tools/check-samsara-miles.mjs`,
  and deploy it on rux's yes.
- [ ] Save the arrival with the miles from the Billing tab's Get from
  Samsara, and show it on the Billing tab beside the Driver seat: on time and
  $20, or the minutes late.
- [ ] Fill the arrival for the trips since the start of the pay period rux
  names, read-only first, written on his yes.
- [ ] Add the $20 where driver pay is added up, once the question is answered.
