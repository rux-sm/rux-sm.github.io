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

- **The schedule's minimum is 17rem,** the width the tight toolbar below is
  measured to read at, so the week never goes narrower than its own controls.
  It spends its days to get there and scrolls to fewer of them. 26rem, three
  whole days beside the 33px bus column, is a different question and only the
  compact week asks it.

- **The week's short form is chosen by the toolbar's width, not the window's,**
  a container query at 25rem. The panels beside the schedule are what take the
  room and a window cannot see them. A small tablet now reads the full week,
  where it used to read the months alone, because at that width it fits.

- **One measurement decides everything,** `placeRoom` in data.js: which panel
  is in front of the board, what the schedule is left, and whether `Today` is
  in the toolbar or in the overflow menu. It reads the board and the panels,
  never the schedule, which is its own output.

## Questions

None.

## Tasks

- [ ] rux resizes the real board on 8641 with the roster and the editor open,
      and reads the week on the phone.
