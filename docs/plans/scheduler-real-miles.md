---
type: plan
---

# Plan: Real miles from Samsara

## Goal

A trip's Actual miles come from Samsara, the buses' tracking system, at the
press of a button, so the office sees how far each bus really went beside
the miles the trip was quoted for.

## Decisions

- **Get from Samsara, on the Billing tab's Miles heading, fills Actual
  miles, and Save writes it.** `trips.actual_miles` already existed, so no
  database change is needed.
- **The `samsara-miles` Edge Function reads Samsara,** as section 7 of
  `scheduler/docs/database-inventory.md` says, because Samsara's API refuses
  calls from a web page and its key must never reach the public site.
- **A bus is the Samsara vehicle named with its number.** Every active coach
  is named that way in Samsara, and a sold bus is renamed in the scheduler,
  so it matches nothing.
- **With two or more buses, Actual miles is the farthest bus's.** Estimated
  miles are one bus's route, so this keeps the two boxes comparable, and the
  panel still lists every bus.
- **Past trips are not filled in bulk.** The button fills one trip at a time.
- **The Samsara key is read-only.** It is made in Samsara under Settings →
  API Tokens with only Read Vehicles and Read Vehicle Statistics, and set as
  the function secret `SAMSARA_API_TOKEN` by rux; no session handles it.

## Questions

## Tasks

- [ ] Make the read-only Samsara key and set it as `SAMSARA_API_TOKEN`
      (rux, in Samsara and the Supabase dashboard).
- [ ] Press Get from Samsara on one past trip in Chrome on :8641, compare
      each bus's miles with Samsara's own trip report, and leave it unsaved.
