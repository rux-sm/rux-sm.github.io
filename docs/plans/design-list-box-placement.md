---
type: plan
---

# Plan: place a list box's menu where it can be seen

## Goal

A combo box or dropdown opened inside anything that scrolls — the scheduler's
trip panel above all — shows its whole list. Today the menu is
`position: absolute` inside the field, so the panel's `overflow: auto` cuts it
off flat at the panel's edge and the options below the cut cannot be seen or
reached without scrolling the panel behind the open list. The contact search
near the bottom of a long panel is where this bites hardest: measured in the
trip panel, the menu overflowed it by 80px.

This is not a theme's problem. The clipping happens in every theme; Carbon's
square corners hide it and ant-dark's rounded ones make it visible.

## Decisions

- **The menu is portaled and `position: fixed`, like the overflow menu,**
  because fixed coordinates are viewport coordinates and escape the clip of
  every scrolling ancestor at once.
- **It flips above the field when there is not enough room below it,** which is
  what a person expects of a dropdown near the bottom of a screen.
- **The arithmetic moves out of `design/js/menu.js` into a helper both call,**
  because two copies of anchor-and-flip drift apart and only one of them would
  get the next fix.
- **The helper is registered through the overlay's `reposition()`,** which
  `design/js/overlay.js` already calls on resize and on scroll in the capture
  phase, so nothing new listens for scrolling.
- **Only a surface computing to `position: fixed` is placed,** the guard
  `menu.js` already applies, so the sink's deliberately-open specimens and any
  pinned example keep rendering where their markup puts them.
- **Carbon's 5.5-row cap stays,** and the menu shrinks below it only when
  neither side of the field has room for it.
- **No `rux--*` class gains a rule for this,** since the change is placement in
  script; ant-dark's radius rules are untouched.

## Questions

- **Does this extend to the date picker's calendar and the popover?** Both sit
  in the same panels and are placed by their own modules, so they may be clipped
  the same way; fixing all three together costs less than three passes, but only
  the list box has a reported failure.
- **Below md the trip panel is a full-width overlay.** Should the menu still
  flip above the field there, or is a list that runs to the bottom of the screen
  the better answer on a phone?
- **When neither side has room, does the menu shrink and scroll inside itself,
  or keep its height and overhang the panel?** Shrinking never covers the
  field; overhanging keeps more options visible at once.

## Tasks

- [ ] Lift the anchor-and-flip arithmetic out of `design/js/menu.js` into a
      shared helper in `design/js/`, with `menu.js` calling it and the overflow
      menu behaving exactly as it does now.
- [ ] Portal the list box's menu on open and place it with that helper, register
      its `reposition()` with the overlay, and put it back on close.
- [ ] Keep the closed state and the in-place specimens working: place only a
      surface that computes to `position: fixed`.
- [ ] Add a sink specimen of a combo box inside a scrolling container, so the
      case the gates run against includes the one that fails today.
- [ ] Check the scheduler's contact search, driver and bus pickers, and every
      other app's combo boxes and dropdowns, in each theme and at phone width.
- [ ] Record the placement contract in `design/docs/choices.md`, so the next
      floating surface is written against one rule rather than a second copy.
