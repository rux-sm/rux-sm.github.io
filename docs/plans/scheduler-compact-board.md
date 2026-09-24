---
type: plan
---

# Plan: the schedule shows the whole week where it cannot show a readable one

## Goal

On a phone, where the board itself is too narrow for three readable days, the
schedule draws all seven instead: a trip becomes a square block in its colour
carrying only its marks, and tapping one opens its writing on a bar docked to
the bottom edge.

## Decisions

### When it turns on

- **Compact is the board's own answer, not a panel's.** `SCHEDULE_FLOOR` names
  the width under which three whole days will not fit, and `placeRoom` asks the
  board against it rather than the room the panels leave: a panel in front of
  the week never makes the week itself a different week. On a desktop the week
  keeps its readable days and scrolls to fewer of them, which
  `scheduler-panel-placement.md` decides.

- **`placeRoom` decides it, as it decides everything else.** It already measures
  the board and the panels and writes `--scheduler-room` and `data-room`; it
  writes `data-board="compact"` on `.scheduler-page` from the same figure.

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

- **It carries two lines and no icons: the destination, and the departure.**
  The same two on every block at every span and every width, because a block
  that reads differently from its neighbour is what makes a week hard to scan.
  A block says which trip it is; the marks are what a trip is opened for, and
  beside a destination this short an icon would take the destination.

- **The departure is a third time form, not a truncation.** `fitTimes` chooses
  between the long and short forms by what fits; a block has room for one time,
  so `.scheduler-bar__time-dep` holds the departure alone, falling back to the
  return and then to the leg's length in days.

- **A double booking is a band across the block's foot.** It keeps the error
  colour and gives up its words, because 44px holds the two lines and no third,
  and it is the one warning that survives the marks going: it is the bar's own
  element rather than part of the marks box.

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

- **It sits over the board at 997,** under the scrim at 1000 and the panel in
  front of the board at 1001, so an open trip and an open roster are both in
  front of it.

- **The board's foot clears it.** The pane's spacer grows by the sheet's
  measured height, so the last bus scrolls out from under it rather than being
  stuck behind it.

### What is not touched

- **The toolbar already answers this width.** `data-room="tight"` moves `Today`
  into the overflow menu and the week reads as its months; compact adds nothing.

- **`share/maintenance.html` keeps its scrolling week,** since nothing opens
  from its grid and a block there could not be tapped.

- **No `rux--*` class is invented.** The grid, the trip bar and the docked bar
  are this app's own under `scheduler-`, as Carbon has none of the three.

## Questions

None open.

## Tasks

- [ ] rux reads a real week compact on the phone, and on 8641 with the roster
      and the editor open.
