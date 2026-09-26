---
type: plan
---

# Plan: The printed week schedule

## Goal

The scheduler prints the week the way rux-ui's Print schedule does, so the
office can pin a week to the wall or hand it to the shop, and rux-ui's version
can be retired. It is the fourth form on the forms page, beside the driver
envelope, the driver itinerary and the customer quote.

## Decisions

- **One week, a row per bus, a column per day,** as the board draws it: each
  trip a bar across its days, with its destination, customer, pickup and
  return times, miles and its requirement icons, and a trip on no bus in its
  own row at the foot.
- **Two reports, as rux-ui has them.** The billing report adds each trip's
  paid mark and seats filled; the maintenance report leaves money off so the
  shop can be handed it.
- **A registry entry in `print.js`,** bound to a week rather than a trip, so
  the forms page asks for a week and the board's own menu can open it for the
  week on screen.
- **The paper, orientation and rows per page are chosen on the forms page,**
  letter landscape and four rows by default, as rux-ui's defaults are.
  The page scales a row down to fit, never below the 55% rux-ui stops at.
- **Printed from Chrome with the Print button,** like the other forms, with
  margins measured by re-applying the print rules as screen rules.

## Questions

1. Does anyone still use Legal or A4 paper for it, or is Letter enough?
2. Does the maintenance report need anything the billing one lacks, such as
   the bus's next service date, or is it the same sheet without money?
3. Should cancelled trips print, struck through, or be left off?

## Tasks

- [ ] Read rux-ui's `print-schedule.js` and a printed sheet from it, and list
      every field it prints in this plan's Decisions.
- [ ] Add the week form to `print.js`'s registry, drawn from the week the
      board reads, with the three choices on the forms page.
- [ ] Measure the sheet at letter landscape and portrait with four and eight
      rows, and at the most trips one day has had.
- [ ] Open it from the board's menu for the week on screen.
- [ ] Remove Print schedule from rux-ui, after reading its own `CLAUDE.md`.
