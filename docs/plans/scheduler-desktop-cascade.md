---
type: plan
---

# Plan: a narrowing desktop changes what the schedule shows, not what is open

## Goal

Dragging a desktop window narrower never takes a panel away. The panels rux
opened stay open; what gives way is the room the schedule spends on each day,
in one order, until nothing is left to give.

## Decisions

### What the pieces cost

Measured in `scheduler/app.css` and `data.js`, at 16px to the rem:

| | Width |
| :--- | :--- |
| Document viewer | 30rem, and `min-inline-size` holds it there |
| Roster | 20rem |
| Trip editor | 20rem |
| Schedule's floor, `SCHEDULE_FLOOR` | 26rem — three readable days |
| Schedule compact | about 20rem — seven day slots and the bus column |

With one left panel, the widest case, nothing has to give above 76rem.

### What happens today, and what is wrong with it

- **The viewer closes itself under 82rem.** `viewerWide` is a media query and
  its `change` listener calls `closeViewer`. The document rux was reading is
  gone, and reopening it is a trip back through the trip's Files.
- **The roster steps aside next.** `placeRoom` prices the roster and sets
  `availCramped` when the schedule cannot keep its floor with it there.
- **Then the board goes compact.** Only after the roster has gone.

Both of the first two take a panel away to keep the days wide, which is the
wrong way round: the days are what the schedule can spend, and a panel is
something rux asked for.

### One left panel at a time

The roster and the viewer both sit left of the board, and opening either
closes the other. Two of them there squeeze the week from both sides for a
pairing that is rarely read together, and with one the app never has to choose
between them as the window narrows -- rux chose, by opening the last one.

So the widest case is one left panel, the board and the editor.

### The order it should give way in

The schedule takes what the panels leave, and gives way in this order:

1. **The board goes compact,** as it already does below `SCHEDULE_FLOOR`: all
   seven days as square blocks rather than three readable ones.
2. **The left panel closes,** where a compact week no longer fits beside it and
   the editor. The editor is never the one that closes: it holds unsaved work
   and it is what the board is being read beside. The week takes the freed
   room back and reads in full again until the window narrows through the
   same step without it.
3. **The overlays take over** where a compact week and one 20rem panel no
   longer sit side by side, which is 40rem. Carbon's md is 42rem and the
   layout already turns there, within 32px of the same answer, so md stays the
   switch and the arithmetic is its reason rather than a second figure.

The roster does not step aside to keep the days wide, as it does now. Below md
it still steps aside, where it is a full-width overlay and would cover the
editor.

### The viewer keeps its 30rem

A document is fitted to the panel's width, so the width is the zoom. A letter
page is 612pt across: at 30rem it renders 11pt text at 8.6px, at 25rem at
7.2px and at 20rem at 5.8px, which is smaller than anything else in the app.
Narrowing the panel the document is being read in defeats the reason it is
open, so the schedule gives way first and the panel keeps its width until it
closes.

### What that costs in window

Three readable days need 76rem with the viewer open and 66rem with the roster,
rather than today's 96rem for all three.

### Opening is gated where closing is

A panel is refused at the width that would close it, so a press never draws
something the next reflow takes away. The viewer's `viewerWide` figure moves
from 82rem to that width.

### What does not change

- **Compact is still the board's state, never a preference.** `placeRoom`
  writes `data-board`, and the row choices in `scheduler.view` come back
  untouched when the board widens.
- **Below md is untouched.** The phone's cascade is the compact board plan's,
  and the roster and editor are overlays there.
- **The viewer still needs room to open.** A first press with no room to draw
  it is refused; that is not the same as closing one already open.

## Questions

- **Does a panel the window closed come back when the window widens?** The
  roster does today: `availOn` holds what was asked for and widening brings it
  back on its own. A viewer that reopens itself is stranger, because the
  document may no longer be the one being worked on.

## Tasks

- [ ] Close the other left panel when one opens, both ways round.
- [ ] Name the panels' widths once, as tokens, rather than three times in
      rules that have to agree with `placeRoom`'s arithmetic.
- [ ] Reorder `placeRoom`: compact the board, then close the left panel, and
      stop pricing the roster as the thing that gives way above md.
- [ ] Move the viewer's gate to the width that closes it, and gate the roster
      the same way.
- [ ] Read a week at each step, with the viewer open and with the roster open,
      in geist and g100.
