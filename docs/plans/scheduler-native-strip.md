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
trips near the view; a panel beside the week pushes it as Carbon's side
panel does, keeping its first day in view. The phone still pages a week at
a time with a swipe of its own.

## Decisions

- **Every task is measured before and after** in Chrome on :8641 on a real
  week, the frames of a swipe, an arrow's move and a 240ms change of the
  week's width, with the numbers in the commit message.
- **Every task is checked at each width the board takes:** seven days with
  nothing open; a list left of the week; the editor right of it; a list and
  the editor together; a panel in front of a week at its 33rem least; Fill
  the window; and the phone, turned both ways.
- **The phone's compact week is the same strip,** as rux decided, swiped
  with the iPhone's own fling and resting on a week's first day, so its own
  swipe code goes; paging was kept only because a fling while the strip was
  drawn again was the risk, and the strip is never drawn again.

## Questions

None open.

## Tasks

- [ ] Bring the phone's week onto the strip, resting on a week's first day,
      checked in the iPhone simulator.
