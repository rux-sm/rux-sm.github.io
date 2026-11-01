---
type: plan
---

# Plan: A board that stays smooth as it scrolls and changes width

## Goal

Every frame of a scroll, a swipe or a change of the board's width fits the
screen's budget, 8.3ms at the 120Hz the Mac draws at, and a panel pushes the
week as Carbon's side panel pushes the page. This plan takes out what costs
every frame and what makes the board stutter at random; the board's own
sideways scrolling, the cause of the rest, is replaced by the browser's in a
plan of its own, which this one writes.

A day on the strip is a fixed 175px and a trip's words stay at its start, so
a change of width or a scroll moves no row: in an arrow's glide one frame in
ten takes about 7ms and in a swipe about 4ms, and a window resize keeps its
frames under 25ms except where it crosses one of Carbon's breakpoints.

## Decisions

- **A window resize crossing one of Carbon's breakpoints, 1056, 1220 or
  1312px, restyles every element,** 51–58ms, because it changes which rules
  apply; the native-strip plan measures it again, since the frame shrinks
  with the elements the board draws.
- **A trip's `aria-expanded` is set where its card opens and closes,** not
  worked out again for some 285 trips by `placeBarOpen` on every resize of
  the grid.
- **Rows keep one height while the strip moves,** as rux decided, and gain
  or lose a lane only once the board has rested for a set time. The
  native-strip plan carries this out, since it is where the board learns it
  has stopped.
- **The native-strip plan is written once the three changes above land,**
  and before the panel motion. It replaces the wheel handling, glides,
  landings and strip redraws with the browser's own scrolling of one long
  strip, drawing only the trips near the view, and deletes the holds that
  stand in for knowing a scroll has ended: `weekMotion`, the `scrollIdle`
  timeout, the rows' grow hold and the grid's `min-block-size` hold. The
  scroll listener's layout read goes with it, and so does the day the strip
  loses as a panel opens: opening a trip moves the first day by one, and
  closing leaves it moved.
- **Every task is measured before and after** in Chrome on :8641 on a real
  week, the frames of an arrow's glide, a swipe and a 240ms change of the
  week's width, with the numbers in the commit message.
- **Every task is checked at each width the board takes:** seven days with
  nothing open; a list left of the week; the editor right of it; a list and
  the editor together; a panel in front of a week at its 33rem least; Fill
  the window; and the phone, turned both ways.
- **A panel pushes the week, as Carbon's side panel pushes the page.** Beside
  the week the panel slides 320px in and fades up over 150ms on the
  productive entrance curve, and leaves on the exit curve, Carbon's own
  keyframes in `design/css/rux.css`; the week narrows and widens over 240ms
  at the same moment, on the productive standard curve, since Carbon's code
  names the 240ms and no curve, and the strip's day snap does not catch it
  half way. In front of the board, on the phone or a week at its least, the
  panel slides over the week as it dims, with Carbon's overlay fade. With
  reduced motion the panel only fades and the week moves at once.

## Questions

None open.

## Tasks

- [ ] Set a trip's `aria-expanded` where its card opens and closes.
- [ ] Write the native-strip plan.
- [ ] Add the panel motion, and correct `design/docs/motion.md`, which files
      a panel arriving under expressive motion where Carbon's side panel is
      productive.
