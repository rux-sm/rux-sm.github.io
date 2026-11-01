---
type: plan
---

# Plan: A board that stays smooth as it scrolls and changes width

## Goal

Every frame of a scroll, a swipe, an arrow's glide or a change of the
board's width fits the screen's budget, 8.3ms at the 120Hz the Mac draws at,
so the board moves as a native app does, and a panel pushes the week as
Carbon's side panel pushes the page.

A day on the strip is already a fixed 175px, so a change of width moves no
trip. What is left is the cost of each frame as the strip moves: in an arrow's
glide the median frame takes 4.3ms and one in ten about 10ms, most of it the
815 sticky rows of the 163 trips drawn, and a few bursts of 18–78ms.

## Decisions

- **A trip's rows are one sticky box, not one each.** Each row sticks so a
  trip's words stay in view as it runs past the bus column; with the rows
  not sticky an arrow's glide took 0.5ms a frame at the median and 5–9ms at
  one in ten, and one box per trip keeps the words in view at about a fifth
  of the boxes.
- **A scroll writes nothing the browser must restyle the board for, and
  reads no layout.** `--scheduler-row-room` is written on the element that
  reads it, not inherited through a trip; `placeBarOpen` sets a trip's
  `aria-expanded` only when it changes, where it now writes about 285 a
  pass; the scroll listener's `fitLanesInView` takes the bus column's width
  from app.css, where reading `offsetWidth` once forced 56ms of layout.
- **The whole-week restyles of 58–78ms that come while idle and scrolling
  are traced to their trigger before they are cut.** `aria-busy` on
  `#scheduler-week` and the redraws of `drawQueuedBar` and `settleOwed` are
  the first suspects.
- **A row gaining a lane is measured again once the rows are one box,** since
  its two frames of 19–20ms are the rows below it laid out again.
- **A panel opening keeps the strip's first day,** moving it only where the
  trip it opens for would leave view, and closing it returns the strip there;
  opening a trip now moves the first day by one and closing leaves it moved.
- **Every task is measured before and after** in Chrome on :8641 on a real
  week, the frames of an arrow's glide, a swipe and a 240ms change of the
  week's width, with the numbers in the commit message.
- **Every task is checked at each width the board takes:** seven days with
  nothing open; a list left of the week; the editor right of it; a list and
  the editor together; a panel in front of a week at its 33rem least; Fill
  the window; and the phone, turned both ways.
- **A panel pushes the week, as Carbon's side panel pushes the page,** and
  comes last. Beside the week the panel slides 320px in and fades up over
  150ms on the productive entrance curve, and leaves on the exit curve,
  Carbon's own keyframes in `design/css/rux.css`; the week narrows and
  widens over 240ms at the same moment, on the productive standard curve,
  since Carbon's code names the 240ms and no curve. In front of the board,
  on the phone or a week at its least, the panel slides over the week as it
  dims, with Carbon's overlay fade. With reduced motion the panel only fades
  and the week moves at once.

## Questions

- Once these land, should the board's sideways scrolling be rebuilt on the
  browser's own: one long strip the browser scrolls, with the Mac's own
  trackpad momentum and day snapping, drawing only the trips near the view?
  It takes out the board's own wheel handling, glides and strip redraws,
  which run on the page's thread, and the two motions
  `design/docs/motion.md` lists for want of a Carbon answer. It is the
  largest change here, so it would get a plan of its own.

## Tasks

- [ ] Make a trip's rows one sticky box.
- [ ] Write `--scheduler-row-room` where it is read, `aria-expanded` only
      when it changes, and take the layout read out of the scroll listener.
- [ ] Trace and cut the whole-week restyles while idle and scrolling, what
      is left of the trip editor's pause on opening, and the frame of 70–85ms
      a resize of the window still has.
- [ ] Measure a row gaining a lane, and cut it where it still costs more
      than a frame.
- [ ] Keep the strip's first day as a panel opens and closes.
- [ ] Add the panel motion, and correct `design/docs/motion.md`, which files
      a panel arriving under expressive motion where Carbon's side panel is
      productive.
