---
type: plan
---

# Plan: A board whose trips never change size

## Goal

On the board, a day is always 175px and a one-day trip always 167px. Seven
days fill the Scheduler's 82rem frame exactly, which a window of about
1,336px holds. A panel beside the week, or a narrower window, shows fewer
days, and the rest scroll into view sideways. Fill the window shows as many
days as the screen holds, more than a week where there is room. The phone
keeps its seven blocks, sized to its width.

From md up the strip's day and bus column are fixed in `scheduler/app.css`
and `app.js` writes no width on the week, so a change of width moves and
restyles no trip. What is left is the rest of that rule: Fill the window in
place of Up to two weeks, nothing else inherited written on a change of
width, and a panel pushing the week as Carbon's side panel pushes the page.

## Decisions

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
- **The `data-days-held` hold goes,** since a day on the strip no longer
  changes while a document is dragged wider.
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

- [ ] Make Fill the window show as many days as fit, and delete Up to two
      weeks and the paged board's two weeks.
- [ ] Register `--scheduler-room` as not inherited.
- [ ] Delete the `data-days-held` hold.
- [ ] Measure the trip editor's opening and cut what is left of its pause.
- [ ] Add the panel motion, and correct `design/docs/motion.md`, which files
      a panel arriving under expressive motion where Carbon's side panel is
      productive.
