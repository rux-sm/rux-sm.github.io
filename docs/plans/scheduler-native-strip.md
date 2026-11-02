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

Today the board from md up is that strip: `scheduler/app.css` has the
browser scroll and snap it, and `drawNear` in `scheduler/data.js` draws its
trips near the view. The phone still pages a week at a time with a swipe of
its own, and a panel beside the week appears at once.

## Decisions

- **Every task is measured before and after** in Chrome on :8641 on a real
  week, the frames of a swipe, an arrow's move and a 240ms change of the
  week's width, with the numbers in the commit message.
- **Every task is checked at each width the board takes:** seven days with
  nothing open; a list left of the week; the editor right of it; a list and
  the editor together; a panel in front of a week at its 33rem least; Fill
  the window; and the phone, turned both ways.
- **A panel opening keeps the strip's first day.** The browser keeps the
  scroll position as the view narrows, and the strip moves only where the
  trip a panel opens for would leave view, by the least distance; closing
  the panel returns it.
- **A panel pushes the week, as Carbon's side panel pushes the page.** Beside
  the week the panel slides 320px in and fades up over 150ms on the
  productive entrance curve, and leaves on the exit curve, Carbon's own
  keyframes in `design/css/rux.css`; the week narrows and widens over 240ms
  at the same moment, on the productive standard curve, since Carbon's code
  names the 240ms and no curve, and the strip's day snap does not catch it
  half way. In front of the board, on the phone or a week at its least, the
  panel slides over the week as it dims, with Carbon's overlay fade. With
  reduced motion the panel only fades and the week moves at once.
- **The phone's compact week is the same strip,** as rux decided, swiped
  with the iPhone's own fling and resting on a week's first day, so its own
  swipe code goes; paging was kept only because a fling while the strip was
  drawn again was the risk, and the strip is never drawn again.

## Questions

None open.

## Tasks

- [ ] Keep the strip's first day as a panel opens and closes.
- [ ] Bring the phone's week onto the strip, resting on a week's first day,
      checked in the iPhone simulator.
- [ ] Add the panel motion.
- [ ] Correct `design/docs/motion.md`: a panel arriving is productive
      motion, as Carbon's side panel is, where it is filed under expressive.
