---
type: plan
---

# Plan: The board's strip scrolled by the browser, and pushed by a panel

## Goal

Sideways the board scrolls as a native app's timeline does: the browser moves
one long strip of days on its own thread, with the trackpad's own momentum,
and brings it to rest on a day's edge. The page's code only draws the trips
that come near the view and tidies up once the board has stopped. Every frame
of a scroll fits the screen's budget, 8.3ms at the Mac's 120Hz, and a panel
opening beside the week pushes it as Carbon's side panel pushes the page.

Today, under a mouse or a trackpad, `scheduler/data.js` moves the strip
itself: app.css hides the strip's sideways overflow, and a wheel handler takes
every trackpad event, scrolls by it, works out the momentum, and runs its own
glides and landings (`glide`, `landGlide`, a spring for a second press). The
strip is five or six weeks long and is drawn again around the week in view as
it nears either end (`growStrip`), and holds stand in for knowing a scroll has
ended. A touch screen already scrolls the strip natively.

## Decisions

- **One long strip, every day from January of the first year with trips to
  the end of next year,** as the year list runs: 2026 and 2027 are 730 days,
  127,750px, well inside what a browser scrolls. It is never drawn again
  around the view, so a scroll never nears an end it has to move.
- **The browser scrolls it, both ways,** with `scroll-snap-type` resting
  sideways on a day's edge and up and down on a row's or a stacked trip's
  top, as the script does now. The wheel handler, `glide`, `landGlide`, the
  spring, `pauseSnap`, `stripEdge`, `laneRest`, `alignRows` and the hidden
  sideways overflow go. A wheel over a trip's tip stays the tip's.
- **Only the trips near the view are drawn.** The rows and the day header
  run the whole strip; a trip is drawn once its days come within two weeks of
  the view, a few each frame while scrolling, and a trip more than four
  weeks off is taken out once the board has stopped. The board reads four
  weeks either side of the view and then seventeen, as now, and days not yet
  read show the loading skeleton until their read lands.
- **The board knows it has stopped from the browser's `scrollend`,** which
  Chrome has had since 114 and Safari since 26.2, on the Mac and the iPhone.
  So `weekMotion`, the `scrollIdle` timeout, the rows' grow hold and the
  grid's `min-block-size` hold go.
- **Rows keep one height while the strip moves,** as rux decided, and gain
  or lose a lane half a second after `scrollend`, if no scroll has begun
  since; the time is set while testing.
- **The first day in view is read from `scrollLeft` on each scroll frame,**
  a day being 175px, so the toolbar's month and the calendar's days follow it
  with no layout read; the roster and the reads follow at `scrollend`.
- **A panel opening keeps the strip's first day.** The browser keeps the
  scroll position as the view narrows, and the strip moves only where the
  trip a panel opens for would leave view, by the least distance; closing
  the panel returns it.
- **Drag and drop scrolls the strip at its edges** through the browser's
  scroll, as it does now through the script's.
- **`scheduler/tools/check-strip.mjs` checks the strip as it now is:** after
  a long scroll, the trips drawn near the view match a whole draw of those
  days. It scrolls with trusted wheel events sent through the browser's
  debugging protocol, which scroll natively as a trackpad does, and it
  measures the frames.
- **`design/docs/motion.md` loses its two motions without a Carbon answer,**
  following a hand and the spring, since the board no longer moves the
  strip itself.
- **Every task is measured before and after** in Chrome on :8641 on a real
  week, the frames of a swipe, an arrow's move and a 240ms change of the
  week's width, with the numbers in the commit message; a window resize
  across Carbon's breakpoints, 1056, 1220 or 1312px, a restyle of every
  element at 51–58ms today, is measured again with fewer trips drawn.
- **Every task is checked at each width the board takes:** seven days with
  nothing open; a list left of the week; the editor right of it; a list and
  the editor together; a panel in front of a week at its 33rem least; Fill
  the window; and the phone, turned both ways.
- **A panel pushes the week, as Carbon's side panel pushes the page,** once
  the strip is the browser's. Beside the week the panel slides 320px in and
  fades up over 150ms on the productive entrance curve, and leaves on the
  exit curve, Carbon's own keyframes in `design/css/rux.css`; the week
  narrows and widens over 240ms at the same moment, on the productive
  standard curve, since Carbon's code names the 240ms and no curve, and the
  strip's day snap does not catch it half way. In front of the board, on the
  phone or a week at its least, the panel slides over the week as it dims,
  with Carbon's overlay fade. With reduced motion the panel only fades and
  the week moves at once.

- **The arrows and Today use the browser's own smooth scroll,** as rux
  decided, so a press moves the strip as a trackpad does; Today from more
  than a week off is set a week short of today and scrolls the last week.
- **The phone's compact week is the same strip,** as rux decided, swiped
  with the iPhone's own fling and resting on a week's first day, so its own
  swipe code goes; paging was kept only because a fling while the strip was
  drawn again was the risk, and the strip is never drawn again.

## Questions

None open.

## Tasks

- [ ] Draw the whole strip's days and only the trips near the view, with the
      loading skeleton for days not yet read.
- [ ] Hand both directions of scrolling to the browser with CSS snapping, and
      delete the wheel handling, glides, landings, spring and strip regrowth.
- [ ] Follow the first day in view on each scroll frame and do the rest at
      `scrollend`, lanes after the rest, and delete the holds.
- [ ] Move the arrows and Today with the browser's smooth scroll.
- [ ] Keep the strip's first day as a panel opens and closes.
- [ ] Rewrite the strip check for the drawn-near-the-view strip.
- [ ] Bring the phone's week onto the strip, resting on a week's first day,
      checked in the iPhone simulator.
- [ ] Add the panel motion.
- [ ] Correct `design/docs/motion.md`: its two motions without a Carbon
      answer go, and a panel arriving is productive motion, as Carbon's side
      panel is, where it is filed under expressive.
