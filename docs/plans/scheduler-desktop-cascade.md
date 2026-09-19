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

So all four at full size need 96rem, and that is the window where nothing has
to give.

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

### The order it should give way in

1. **The viewer narrows to the editor's width,** 30rem to 20rem. The two side
   panels then match, which is also tidier than one wide and one narrow. It
   buys 10rem.
2. **The board goes compact,** as it already does below the floor: all seven
   days as square blocks rather than three readable ones. It buys 6rem.
3. **A left panel closes,** under about 80rem, where three 20rem panels and a
   compact week no longer fit. The trip editor is never the one: it holds
   unsaved work and it is what the board is being read beside.
4. **The other left panel closes** under about 60rem. That lands on md, 42rem,
   where the layout becomes overlays anyway, so in practice the ladder ends
   with the editor and a compact week.

The roster does not step aside to keep the days wide, as it does now. It
closes only at step 3 or 4, with the viewer. Below md it still steps aside,
where it is a full-width overlay and would cover the editor.

### The ladder

| Window | What the schedule shows | Panels |
| :--- | :--- | :--- |
| 96rem and up | three readable days | all three, viewer 30rem |
| 86–96rem | three readable days | all three, viewer 20rem |
| 80–86rem | compact week | all three at 20rem |
| 60–80rem | compact week | one left panel closed |
| 42–60rem | compact week | the editor alone |
| under 42rem | the phone's own cascade | overlays |

### Opening is gated where closing is

A panel is refused at the width that would close it, so a press never draws
something the next reflow takes away. The viewer's `viewerWide` figure moves
from 82rem to the width the ladder closes a left panel at.

### What does not change

- **Compact is still the board's state, never a preference.** `placeRoom`
  writes `data-board`, and the row choices in `scheduler.view` come back
  untouched when the board widens.
- **Below md is untouched.** The phone's cascade is the compact board plan's,
  and the roster and editor are overlays there.
- **The viewer still needs room to open.** A first press with no room to draw
  it is refused; that is not the same as closing one already open.

## Questions

- **Which left panel closes first, the roster or the viewer?** The roster costs
  nothing to bring back, a press away with nothing lost, while the viewer
  loses the document being read. That argues the roster goes first, but a
  roster open beside an editor is usually open because it is being used.
- **Does a 20rem viewer still read?** A PDF fitted to the width of 320px is
  small. If it does not, the viewer's narrow width is a different number and
  step 1 buys less.

## Tasks

- [ ] Answer the two questions above.
- [ ] Give the viewer a narrow width and the rule that picks it, with the
      panels' widths named once in tokens rather than three times in rules.
- [ ] Reorder `placeRoom` into the ladder: narrow the viewer, compact the
      board, then close a left panel, and stop pricing the roster as the thing
      that gives way above md.
- [ ] Move the viewer's gate to the width the ladder closes it at, and gate
      the roster the same way.
- [ ] Read a week at each rung with all three panels open, in geist and g100.
