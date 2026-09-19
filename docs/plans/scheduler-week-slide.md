---
type: plan
---

# Plan: the next week slides in under the finger

## Goal

On the compact board a horizontal drag carries the week with it and brings the
next one in beside it, so the gesture is visible while it is happening and can
be abandoned halfway. Past a threshold it settles on the new week; short of it,
it springs back.

## Decisions

### It is the real next week, not a picture of one

The read already covers the week either side, so the incoming week is rendered
from what is in hand with no network. That is what makes this possible at all:
a slide that had to wait on a query would stutter every time.

A week the cache does not hold — a jump from the date picker rather than a step
— draws as it does now, with no animation. The gesture only ever steps.

### Two grids in a slider inside the pane

The pane keeps its scroll and its height; inside it a slider holds the grid
being read and the grid coming in, side by side at the pane's width, and the
slider is what moves. On settling, the incoming grid becomes the only one and
the slider returns to zero with no transition.

### Stickiness is suspended while it moves

The bus column and the day band are `position: sticky` against the pane, so two
grids side by side would both pin their own column to the same left edge and
the incoming week's numbers would sit over the outgoing week's days.

While the slider moves they are `position: static`, which is also what the
motion means: a week travelling away takes its own bus numbers and its own
dates with it, as a sheet of paper would. They stick again once it settles.

### The finger, then a spring

A drag moves the slider one pixel for one pixel. On release, the thresholds the
swipe already uses decide it — 40px, or 24px for a quick one — and the slider
eases to the week it landed on in 200ms, or back to zero. A gesture the browser
cancels springs back the same way.

### Where it does not run

Not outside compact, where the axis is the week scrolling to its other days.
Not where the pane still scrolls sideways, which is every phone under about
346px. Not while a trip is being carried. Not from the screen's first 24px,
which the system takes for its own back. These are the swipe's own conditions
and it keeps them.

Not where the viewer asks for less motion: under `prefers-reduced-motion` the
week changes with no slide, as it does today.

## Questions

None open.

## Tasks

- [ ] Put a slider between the pane and the grid, holding the read grid and a
      second one, each the pane's width, and move it with a transform.
- [ ] Render a neighbouring week into the second grid from the cache, and leave
      the gesture inert where the cache cannot answer.
- [ ] Suspend `position: sticky` on the corner, the day band and the row heads
      while the slider moves, and restore it on settling.
- [ ] Follow the finger on `pointermove`, and on release ease to the landed
      week or back to zero, taking the swipe's existing thresholds.
- [ ] Settle by making the incoming grid the read one, returning the slider to
      zero untransitioned, and re-fitting the columns.
- [ ] Leave the slide out under `prefers-reduced-motion`.
- [ ] Read it on a phone: drag slowly both ways and let go short of the
      threshold; flick; drag while a trip is selected; drag at 320px where the
      pane scrolls; and hold a trip to carry it without the week moving.
