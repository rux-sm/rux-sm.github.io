---
type: plan
---

# Plan: Real miles from Samsara

## Goal

A trip's Actual miles come from Samsara, the buses' tracking system, at the
press of a button, so the office sees how far each bus really went beside
the miles the trip was quoted for.

## Decisions

- **The Billing tab's Actual miles box is where they land.**
  `trips.actual_miles` already exists, the editor saves it and the week
  schedule prints it, and no trip has one yet, so no database change is
  needed.
- **A button fills the box, and Save writes it.** Get from Samsara, beside
  Actual miles, shows each bus's miles for each leg and fills the box; the
  trip is written only when staff press Save, like every other field.
- **Miles are the odometer's difference.** For each bus on each leg, the
  reading at yard-back is taken from the reading at yard-out, using the
  engine's odometer (`obdOdometerMeters`), or Samsara's GPS odometer
  (`gpsOdometerMeters`) where the engine gives none.
- **The window is the leg's planned yard-out to yard-back, widened by two
  hours each side.** A parked bus adds no miles, so the margin only catches
  an early start or a late return. When the same bus has another trip inside
  the window, the panel says so and fills nothing for that bus.
- **Times are the office's, America/Chicago.** The stops keep local times
  with no zone, and the function adds that date's offset before asking
  Samsara.
- **A bus is matched to its Samsara vehicle by VIN,** and by unit number
  where the scheduler has no VIN. A bus with no Samsara vehicle, like the van
  or a bus from another company, shows Not in Samsara and adds nothing.
- **Samsara is read through a new Edge Function, `samsara-miles`, in
  `scheduler/samsara-miles/`,** because Samsara's API refuses calls from a web
  page and its key must never reach the public site. It runs on the caller's
  own log-in, as the connector does, so only staff can read a trip through it.
- **The Samsara key is read-only.** It is made in Samsara under Settings →
  API Tokens with only Read Vehicles and Read Vehicle Statistics, and set as
  the function secret `SAMSARA_API_TOKEN` by rux; no session handles it.
- **Deploying the function is its own step,** on rux's yes, as with the other
  three.

## Questions

- **When a trip has two or more buses, is Actual miles their miles added
  together, or the farthest bus's?** A quarter of trips have more than one
  bus. Estimated miles are one bus's route, so the farthest bus keeps the two
  boxes comparable, and the panel still lists every bus. Recommended: the
  farthest bus.
- **Should past trips be filled too?** The button fills one trip at a time;
  filling every past trip at once is a bulk write, shown first as its own
  step. Recommended: the button only, for now.

## Tasks

- [ ] Make the read-only Samsara key and set it as `SAMSARA_API_TOKEN`
      (rux, in Samsara and the Supabase dashboard).
- [ ] List Samsara's vehicles with their VINs beside the scheduler's buses,
      and settle 897: the scheduler has an active 897 with no VIN and a sold
      897 with one.
- [ ] Write `scheduler/samsara-miles/` as `index.ts` and `handler.ts`: take a
      trip id, read its legs, stops and buses on the caller's session, match
      each bus to its vehicle, and return each bus's miles per leg with the
      readings used.
- [ ] Add it to the function list in `scheduler/tools/check-connector.mjs`,
      and test the handler offline with invented readings: a normal leg, a
      leg past midnight, a bus not in Samsara, a bus with another trip in its
      window, and a missing reading.
- [ ] Deploy `samsara-miles` on rux's yes, then call it for one past trip
      and compare the miles with Samsara's own trip report.
- [ ] Add Get from Samsara and its panel beside Actual miles on the Billing
      tab in `scheduler/data.js`, from Design's parts, and prove a Save in
      Chrome on :8641 by `scheduler/docs/proving-a-save.md`.
- [ ] Describe the function in the Edge Functions part of
      `scheduler/docs/database-inventory.md`, which still counts two of the
      three that exist, and name it in `scheduler/README.md`.
