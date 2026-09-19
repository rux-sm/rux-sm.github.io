---
type: plan
---

# Plan: a panel is beside the week or in front of it, never over it

## Goal

Every panel opens, at every width, and the week is either readable beside it or
plainly set aside behind it. No panel is taken away by a window that narrowed,
none is refused because a window is small, and none is ever drawn over a week
that still claims the width it is covering.

## Decisions

### Two states, and no third

A panel drawn over a week that still claims its full width covers the toolbar's
controls and the bus column, which are the two things the week cannot be read
without. So there are two states and nothing between them.

**Beside.** The panel is a column in the board and the week spends its days to
make room, scrolling to fewer of them.

**In front.** The panel is a card over the board: 16px in from the header and
from every edge, so its corners have a page behind them and keep the curve and
the edge its theme gives them, and so the board it covers still shows around
it. It takes its own width where that fits inside the inset and what the inset
leaves where it does not, so only the schedule ever fills the board's width.
The board behind is dimmed, and is not reachable by a click or a Tab: what is
on screen and what can be reached are the same thing. Escape, the panel's close
button and a press on the dim all leave it.

### One sum decides it

The week's minimum plus every open panel is what the board is asked for. While
the board holds that, every panel is beside the week. Past it the newest panel
goes in front, and only ever one: behind it the board is the week alone, the
others still open and simply not drawn, so closing the one in front puts the
board back exactly as it was rather than starting a cascade.

Nothing closes itself and nothing is refused. What a narrowing window changes is
only which panel is in front.

### The week's minimum is its own toolbar

17rem, the width the tight toolbar is measured to read at. The week never goes
narrower than its own controls, which makes the number derived rather than
chosen. It is not the compact week's 26rem: that asks whether the board can show
three readable days, which `scheduler-compact-board.md` decides from the board's
own width and never from what the panels leave.

### Everything is priced from its token

`placeRoom` prices each panel from the token `app.css` lays it out with, never
from the panel itself, because a panel in front has given its width up and
pricing it by what it takes would unmake the decision that moved it.

`placeRoom` is called where a panel opens or closes, not watched for: a panel
that has just come to the front has no width of its own to report. The board's
width is the one thing watched, being what the window sets.

## Questions

None open.

## Tasks

- [ ] Read a week with each of the three panels in front in g100, where the
      card has no edge and no corner of its own and the dim is all that parts
      it from the board. Geist reads right already.
- [ ] Press Drivers with a trip open on a narrow window, and leave the roster
      by Escape, by its close button and by pressing the dim.
