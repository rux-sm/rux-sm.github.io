---
type: plan
---

# Plan: More from Samsara

## Goal

The scheduler reads more of what Samsara already knows, so the office sees
trouble on the board without opening Samsara: a driver on a trip who is
not logged in, in the wrong bus, over hours or on the wrong hours rules;
and each pre-trip inspection, safe or not. A customer can follow their
bus on a link the office sends. What `samsara-now` reads today is in
`scheduler/docs/database-inventory.md` §8, and the driver tile it feeds in
`scheduler/docs/screen-inventory.md`.

## Decisions

- **A driver on a trip whose app is disconnected says Not logged in.**
  Samsara's clocks list every driver and give a disconnected one an empty
  duty, so `samsara-now` answers them with no duty, where a driver Samsara
  does not have is absent. On a trip under way the tile has the amber
  warning mark and "Not logged in" in its line; off a trip it stays the
  quiet dash.
- **A driver logged into the wrong bus says so on their tile.** The rail
  finds the bus in `samsara-now`'s buses whose crew holds the driver, as a
  trip bar's Wrong bus does, and on a trip under way a bus that is none of
  the ones they ride on it, a co-driver's other buses among them, gives the
  red bus alert mark and "in 133" in red.
- **Over hours comes from Samsara's own violation.** The clock's
  `violations` gives the shift-driving and cycle time a driver is over now;
  over zero is the red mark and "Over 0:25" in red, and "0:00 left" stays
  red for a driver Samsara counts no violation for yet.
- **Each driver's hours rules are checked against the bus rules.**
  `samsara-now` reads Samsara's drivers for each one's rules; a driver whose
  rules are not a passenger carrier's has a red mark on their tile and its
  words on their card, since every clock they show is wrong, and the fix
  is their settings in Samsara.
- **Samsara's inspections are read live, not stored.** `samsara-now`
  reads the last day's inspections and any still unsafe from thirty days:
  a trip bar warns No pre-trip once yard-out has passed with none since two
  hours before it, and a bus with an unsafe one has a red mark until a
  mechanic resolves it in Samsara. No defect is copied into the Fleet
  profile.
- **A customer can follow their bus on a Samsara live link.** The bar's
  menu has Copy tracking link for a leg's bus on its days, which asks a new
  Edge Function, `samsara-share`, for Samsara's live map link of that one
  vehicle, expiring an hour after the leg's return, and copies it for the
  office to text the trip's contact. The stops stay the scheduler's and are
  not copied into Samsara as a route.
- **Safety events stay in Samsara.** Hard braking, speeding and phone use
  are the office's to review there, not the board's.
- **Each database change is its own step,** SQL shown to rux and applied on
  his yes before the code that reads it is pushed.

## Questions

None open.

## Tasks

- [ ] Make a Samsara API token with Write Live Sharing Links alone, under
      Driver Workflow, and set it as the `SAMSARA_SHARE_TOKEN` secret;
      `samsara-share` answers no-key until then.
- [ ] Add Copy tracking link to the bar's menu, calling `samsara-share`.
