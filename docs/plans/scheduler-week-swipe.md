---
type: plan
---

# Plan: a swipe changes the week on the compact board

## Goal

On a phone the week changes by swiping the board sideways, the two chevrons
come off, `Today` takes their place beside the week, and the week either side
is already in hand so the change draws with no wait and no dimming.

## Decisions

### The gesture belongs to the compact board alone

On the full board a horizontal drag is already the week scrolling sideways, and
compact is the one state where all seven days fit and that axis is free.

It is keyed to `data-board="compact"`, never to a width: between 26rem of board
and Carbon's md the board is not compact and its week still scrolls, so the
chevrons stay there.

### It yields to three things

- **The pane, while it still scrolls.** Compact does not always fit: a 320px
  phone leaves the week 288px against the 312px seven days need, and there the
  finger has to scroll.
- **A trip being dragged.** Every bar installs a hold-and-lift drag on touch;
  the gesture stands down while `touchDragging` is set.
- **iOS's own edge-back,** which is this same gesture: a swipe starting within
  the page's own margin of the left edge is left to the system.

`touch-action: pan-y` on the week in compact lets vertical scrolling through and
leaves the horizontal axis to this.

### `Today` takes the chevrons' place

A gesture can replace a step and nothing replaces a jump home. Each chevron and
the `Today` button are all icon-only at 40px, so the swap frees 40px.

In compact the chevrons hide, `.scheduler-toolbar__lg-only` shows, and the
overflow menu's own `sm-only` row hides with it, so `Today` is in one place
rather than two. Below md but not compact nothing changes.

### The weeks either side come from the read there already is

Trips are read by `start_date` from 90 days before the week to its end, which
is 97 days fetched to draw seven, because a trip that started earlier can still
run through the week. Widening that by 7 days each way costs 14% of one query
and needs no second one; the two time-off tables widen with it, and buses,
drivers, contacts and settings are whole-table reads already.

A month either side is +58% of the fattest payload in the app for nothing the
gesture uses: a distant jump goes through the date picker, which takes its own
read.

### Cache, then check

A swipe draws its week from memory with no network, which is what removes the
dim. That week is then re-read in the background and redrawn if it differs,
because every change re-reads today and so always shows current data; caching
without the check would let someone else's edit go quietly missing while two
people dispatch at once.

### The week label is left alone

It keeps its months-only form on a phone. The day band beneath it already
numbers the days, so spending the 40px the swap frees on a fuller label would
buy a second telling of something already said, and the container query's 25rem
stays as it is.

### It does not track the finger

Three grids side by side, each with its own sticky bus column, is a different
piece of work. This stops at instant.

## Questions

None open.

## Tasks

- [ ] Widen the read window 7 days each way, and keep the three weeks it
      returns rather than the one being drawn.
- [ ] Draw a week from that cache where it is there, then re-read it and redraw
      only if it differs.
- [ ] Bind the gesture on the week in compact with `touch-action: pan-y`,
      standing down for a scrolling pane, for `touchDragging`, and for a start
      inside the left margin.
- [ ] Hide the chevrons in compact, show `Today` beside the week, and hide the
      overflow menu's own `Today` with them.
- [ ] Read it on a phone: swipe both ways, swipe with a trip selected, swipe at
      320px where the pane still scrolls, and hold a trip to carry it without
      the week moving.
- [ ] Confirm the docked sheet goes with the selection on a week change and the
      trip in the editor stays, as `scheduler-bar-shortcuts.md` says it does.
