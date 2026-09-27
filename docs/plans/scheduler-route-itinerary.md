---
type: plan
---

# Plan: the Route tab as the office's itinerary

## Goal

The office enters a customer's itinerary on the Route tab, stop by stop, and
the tab works out what the office needs from it: when the bus leaves and
reaches the yard, the miles, the driving and the on-duty time. A trip like the
Laredo volleyball trip of Sep 22 goes in whole, without workarounds.

## Decisions

- **A stop is where the bus stands still.** Games, meals and other events
  during a wait are not entered; only the bus's movements matter.
- **Times come from the customer's itinerary, drives from the map.** A stop's
  arrive and leave times are typed as the customer gives them. The drive and
  miles between two places are always Geoapify's, never typed.
- **A stop may have no address,** like a restroom break on the road. Its name
  says what it is, and its row carries a warning tag, No address. The drive
  is measured across it, from the place before to the place after, and shown
  on the leg after it.
- **The Route tab is for the office.** The driver keeps the customer's
  uploaded itinerary. The driver page and the printed driver itinerary stay as
  they are until the tab is trusted.
- **Every test runs on invented trips** in a preview with a stand-in database,
  so no real trip is changed to try the tab.

## Questions

- When the typed times leave less time between two stops than the map's
  drive, should the tab warn on that leg, such as "Drive 2 h 47, only 2 h 15
  between these times"?

## Tasks

- [ ] Let the stop dialog save a stop with a name and no place, and tag it No
  address in the list.
- [ ] Measure the drive across a stop with no address, from the place before
  to the place after, and count it once in the totals.
- [ ] Enter the Laredo trip's itinerary in a stand-in preview, every stop and
  time, and fix whatever does not go in or does not add up.
- [ ] Check the yard times, miles, driving and on-duty figures against the
  trip's own totals, and account for every difference.
- [ ] Update the Route tab's line in `scheduler/docs/screen-inventory.md`.
