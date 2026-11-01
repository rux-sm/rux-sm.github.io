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

A day on the strip is a fixed 175px, so a change of width moves no trip.
What is left: in an arrow's glide the median frame takes 4.3ms and one in ten
about 10ms, most of it the 815 sticky rows of the 163 trips drawn. A window
resize still has one frame of about 58ms, and of 74–93ms where it crosses one
of Carbon's breakpoints, a restyle of the whole page with no script in it.

## Decisions

- **A window resize's slow frame is measured again once the sticky words
  go,** because it is a restyle of every element: crossing one of Carbon's
  breakpoints, 1056, 1220 or 1312px, changes which rules apply, and the
  frame shrinks with the elements the board draws. The 58ms frame that comes
  where no breakpoint is crossed is traced then.
- **A trip's words stay at its own start; nothing sticks or slides,** as rux
  decided: the sticking was made before the strip scrolled continuously,
  and a swipe now shows the rest. A trip that starts a day or two before the
  first day in view shows no words until it is swiped to or selected; over
  Nov 1–14, 2 to 5 trips on screen did on 12 of the 14 days. The sticky rows,
  `fitStuckRows` and its scroll, frame and resize calls, and
  `--scheduler-row-room` go. The customer and update rows' words run to the
  trip's end and end in "…" there, worked out in app.css from the trip's
  length, since they no longer move. The bar keeps its clip, and
  `--scheduler-live-day` stays, because a trip on the road starts its words
  at today's column by it.
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

- [ ] Delete the sticky words.
- [ ] Measure a window resize again, and trace the 58ms frame it has where
      it crosses no breakpoint.
- [ ] Set a trip's `aria-expanded` where its card opens and closes.
- [ ] Write the native-strip plan.
- [ ] Add the panel motion, and correct `design/docs/motion.md`, which files
      a panel arriving under expressive motion where Carbon's side panel is
      productive.
