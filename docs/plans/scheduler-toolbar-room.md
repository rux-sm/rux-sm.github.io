---
type: plan
---

# Plan: the schedule's toolbar keeps one row

## Goal

The schedule's toolbar is one row at every width, and the schedule holds three
whole days beside the panels open, with the week label and the driver roster
giving way to keep that true.

## Decisions

- **The toolbar never wraps.** A flex container breaks its lines at each item's
  own width before it shrinks anything, so a toolbar allowed to wrap drops its
  buttons to a second row instead of ever letting the week ellipse. That one
  setting was the stacking.

- **The schedule's floor is 26rem:** three whole days beside the 33px bus
  column, since a day will not go under the 127px `--scheduler-day-min`. The
  trip editor's own 20rem was asked for and shows 2.3 days, which leaves a part
  column at the edge; 26rem is also what the itinerary panel's existing 82rem
  gate already assumes.

- **The week's short form is chosen by the toolbar's width, not the window's,**
  a container query at 25rem. The panels beside the schedule are what take the
  room and a window cannot see them. A small tablet now reads the full week,
  where it used to read the months alone, because at that width it fits.

- **One measurement decides everything,** `placeRoom` in data.js: the roster's
  yield, what the schedule is left, and whether `Today` is in the toolbar or in
  the overflow menu. It reads the board and the panels, never the schedule,
  which is its own output.

## Questions

None.

## Tasks

- [ ] rux resizes the real board on 8641 with the roster and the editor open,
      and reads the week on the phone.
