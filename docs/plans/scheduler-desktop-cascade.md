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
3. **Nothing else gives.** Under about 80rem the panels no longer fit beside a
   compact week, and that is the width the last question below is about.

The roster does not step aside on a desktop at all. Below md it still does,
where it is a full-width overlay and would cover the editor.

### What does not change

- **Compact is still the board's state, never a preference.** `placeRoom`
  writes `data-board`, and the row choices in `scheduler.view` come back
  untouched when the board widens.
- **Below md is untouched.** The phone's cascade is the compact board plan's,
  and the roster and editor are overlays there.
- **The viewer still needs room to open.** A first press with no room to draw
  it is refused; that is not the same as closing one already open.

## Questions

- **What gives at the bottom?** Under about 80rem the three panels and a
  compact week do not fit. The choices are the board scrolling sideways again,
  the schedule shrinking under its compact width, or the viewer finally
  closing as it does now. Which?
- **Does a 20rem viewer still read?** A PDF fitted to the width of 320px is
  small. If it does not, the viewer's narrow width is a different number and
  step 1 buys less.
- **Should the viewer's 82rem gate move to 80rem,** so the width that lets it
  open is the width where everything still fits?
- **Does the roster keep its place in the order at all,** or is it simply never
  given up on a desktop, and rux closes it by hand when the window is small?

## Tasks

- [ ] Answer the questions above.
- [ ] Give the viewer a narrow width and the rule that picks it, with the
      panels' widths named once in tokens rather than three times in rules.
- [ ] Reorder `placeRoom`: narrow the viewer, then compact, and stop pricing
      the roster as the thing that gives way above md.
- [ ] Stop `viewerWide` closing an open viewer, keeping its gate on opening.
- [ ] Read a week at each step of the cascade with all three panels open, in
      geist and in g100.
