---
type: plan
---

# Plan: the schedule shows the whole week where it cannot show a readable one

## Goal

Wherever the schedule is too narrow for three readable days, it draws all seven
instead: a trip becomes a square block in its colour carrying only its marks,
and tapping one opens its writing on a bar docked to the bottom edge. The phone
and a desktop squeezed by two open panels reach this the same way.

## Decisions

### When it turns on

- **Compact is what happens below the floor, in place of scrolling sideways.**
  `SCHEDULE_FLOOR` already names the width under which the schedule cannot show
  three whole days; today the board scrolls there and shows about two. No second
  threshold is invented, because the figure that says "a readable week does not
  fit" is the one that should choose the other week.

- **`placeRoom` decides it, as it decides everything else.** It already measures
  the board and the panels and writes `--scheduler-room` and `data-room`; it
  writes `data-board="compact"` on `.scheduler-page` from the same figure. The
  panels beside the schedule are what take the room and a window cannot see
  them, which is why the toolbar's own switch is a container query.

- **The cascade is three steps, most valuable last to give way.** Above the
  floor, the full board. Below it the roster steps aside, as it does now, and
  the room is measured again. Only where that still leaves less than the floor
  does the schedule go compact. A readable board is preferred wherever one fits.

- **Nothing is stored and nothing is toggled.** Compact is the board's state,
  never a preference, so it must not write over the row choices in
  `scheduler.view`: those come back untouched when the board widens.

### What it draws

- **A compact day is one shortcut slot wide, where a full day is three.** The
  127px `--scheduler-day-min` is three 40px slots plus a bar's gaps, so that a
  one-day bar is exactly as wide as the shortcut bar pointing at it. The
  shortcut bar is docked in compact and no longer sets the day's width, so the
  day falls to the single slot a tap needs: seven days and the bus column come
  to about 313px, which fits every phone but the smallest, where it still
  scrolls.

- **A compact trip is one slot wide and 44px tall.** Width is the scarce
  dimension here and height is not, so the row takes the 44px a phone asks of a
  target rather than the 40px that would make the cell square.

- **It carries its colour and its marks, and no writing, however long it is.**
  The colour is already the trip's own, and the marks are the box the bar
  already builds: the requirement the bus lacks, the payment rung, the hotel and
  the missing itinerary, over the conflict strip that keeps its own colour and
  gives up its words. `fitMarks()` already caps marks to the room
  a row has and counts the rest into `.scheduler-bar__warn-more`, so a 40px
  block gets its cap for free. A five-day block has room for a destination and
  does not draw one, because every block reading the same way is what makes the
  week readable at a glance.

- **Lanes stay.** A bus with two overlapping trips draws two rows of blocks and
  the row grows, because a double booking is the thing a week at a glance is for.

- **The bus column stays, sticky as it is.** A block says which day; only the
  row head says which bus.

### Where the writing goes

- **The shortcut bar docks to the bottom edge and grows.** It is already the
  selection's surface, already floats clear of the trip and already holds the
  actions; at 40px it has nothing to float beside, so it docks instead. This
  is the phone case that `scheduler-bar-shortcuts.md` left for the board to
  answer, not a second surface asking "what is this trip".

- **It carries the six rows the block can no longer draw,** destination, client,
  contact, time, notes and drivers, above its slots. The rows move; they are
  not restated, and the bar keeps its own slots and their customizing.

- **Selecting is still not opening.** A tap selects and docks the bar; Open
  trip, in the first slot, loads the trip into the panel as it does everywhere
  else, and Escape clears the selection and takes the bar with it.

- **It sits over the board at 997,** under the roster overlay's 998 and the trip
  panel's 999, so an open trip and an open roster are both in front of it.

- **The board's foot clears it.** The pane's spacer grows by the sheet's
  measured height, so the last bus scrolls out from under it rather than being
  stuck behind it.

### What is not touched

- **The toolbar already answers this width.** `data-room="tight"` moves `Today`
  into the overflow menu and the week reads as its months; compact adds nothing.

- **No `rux--*` class is invented.** The grid, the trip bar and the docked bar
  are this app's own under `scheduler-`, as Carbon has none of the three.

## Questions

- **Does a block say when a trip has no driver?** The crew and their statuses
  live on the drivers row, not in the marks box, so the block loses them: a trip
  with nobody on it looks like a finished one until it is tapped. Putting it in
  the box would add a mark to the full bar as well, which is why it is not
  assumed here.

- **Does `share/maintenance.html` go compact too?** Its grid is
  `.scheduler-week--static`: nothing opens from a bar, so a block there would
  be untappable and the docked bar would never come. The choice is a
  read-only compact week, or leaving that page scrolling as it is.

## Tasks

- [ ] `specimen.html`: the compact board and the docked bar as their own
      section, beside the full one, once the toolbar there is rebuilt.
- [ ] `docs/screen-inventory.md`: the compact board in §3, and the note under
      "The trip bar does not expand" that says what a block does instead.
- [ ] rux reads a real week compact on the phone, and on 8641 with the roster
      and the editor open.
