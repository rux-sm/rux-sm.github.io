---
type: plan
---

# Plan: A board whose trips never change size

## Goal

On the board, a day is always 175px and a one-day trip always 167px. Seven
days fill the board's default width exactly, which a window of about 1,336px
holds. A panel beside the week, or a narrower window, shows fewer days, and
the rest scroll into view sideways. Fill the window shows as many days as
the screen holds, more than a week where there is room. The phone keeps its
seven blocks, sized to its width.

From md up, a change of width then only changes how much of the strip is in
view and moves or restyles no trip, so the board keeps up frame by frame and a panel
can push the week as Carbon's side panel pushes the page. Today each change
costs 90–125ms, because `fit` in `scheduler/app.js` writes the day and
bus-column widths on `#scheduler-week`, which all 6,300 of its elements
inherit and restyle for; the width alone costs 1–2ms.

## Decisions

- **A day on the strip is 175px, one value in `scheduler/app.css`,** the
  day the board draws at full width today; the grid's columns, every trip,
  the yard and the out-of-service stripes read it, and `app.js` writes no
  day width for the strip.
- **The phone keeps `fitColumns`' seven days,** a seventh of its width each
  on whole pixels, because its width changes only when it turns, so the
  write costs nothing in use and Safari stays on the path it already draws.
  The compact week is the phone's: it turns on when the whole board is under
  33rem, which a panel opening does not change.
- **`app.js` hands `data.js` the day it draws at** through
  `window.Rux.schedule`, 175px on the strip and the phone's own width on the
  phone, because `dayWidth()` and its 15 callers read the
  `--scheduler-day-w` the strip stops writing.
- **The bus column is the kit's width,** 69px, as the components page
  already draws it, so nothing about it changes with the window.
- **The default width is made from them:** seven days, the bus column and
  its edges, in place of Design's 82rem for the scheduler, so the two cannot
  drift apart; it comes out about 8px narrower than now.
- **Fill the window shows as many days as fit,** the next day's start
  showing at the right edge as it does beside a panel, up to 21. The strip
  runs two weeks past the last day in view, as it does now, and at 21 days
  in view that reaches the edge of the four weeks either side a read holds.
  Up to two weeks goes, since inside the default width it never showed more
  than seven, and so do `fitDays`, `MAX_IN_VIEW` and the paged board's two
  weeks, `twoWeeks` and `TWO_WEEKS_MIN`, which no option turns on.
- **Nothing inherited is written when the width changes.** `--scheduler-room`
  is read only by `.scheduler-frame` but inherited by everything in it, so
  it is registered as not inherited.
- **The `data-days-held` hold goes,** since a day no longer changes while a
  document is dragged wider.
- **Every task is measured before and after** in Chrome on :8641 on a real
  week, a full `fit` and the frames of a 240ms change of the week's width,
  with the numbers in the commit message.
- **Every task is checked at each width the board takes:** seven days with
  nothing open; a list left of the week; the editor right of it; a list and
  the editor together; a panel in front of a week at its 33rem least; Fill
  the window; and the phone, turned both ways. Where a panel opens, the
  trip it opens for stays in view as the week narrows.
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

None open.

## Tasks

- [ ] Make a day on the strip 175px and the bus column the kit's width,
      read by the grid and every trip, with `app.js` writing neither there
      and handing `data.js` the day it draws at.
- [ ] Make the scheduler's default width seven days and the bus column.
- [ ] Make Fill the window show as many days as fit, and delete Up to two
      weeks and the paged board's two weeks.
- [ ] Register `--scheduler-room` as not inherited.
- [ ] Delete the `data-days-held` hold.
- [ ] Measure the trip editor's opening and cut what is left of its pause.
- [ ] Add the panel motion, and correct `design/docs/motion.md`, which files
      a panel arriving under expressive motion where Carbon's side panel is
      productive.
