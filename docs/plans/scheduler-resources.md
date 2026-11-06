---
type: plan
---

# Plan: Buses and drivers are handled the same way

## Goal

The board's three things, its trips, buses and drivers, are always on
screen together, and its two resources read and act alike. A bus's head
stands at the start of its row in the bus column; a driver's stands in a
names rail that is always open against the board, and a chevron opens the
week's squares beside the names when a driver is being found for a trip.
What a bus or a driver is doing now is their head's, and a trip bar keeps
what is about its trip, as the bus column already took the speed, fuel and
DEF off the bars.

Today the roster is a panel the toolbar's Driver availability toggle opens
and shuts, so the drivers' heads, the 40px two-line cells
`scheduler/docs/screen-inventory.md` describes, are often off screen, and a
bar out on the road still carries each seat's duty mark, hours meter and
rest meter. The mockup rux chose from is `design/m/resources/?layout=4`,
local and unpublished, served on :8641.

## Decisions

- **The board stays laid out by bus.** A trip sits in its bus's row and its
  drivers in its seats; a rows-by-driver view would draw every trip once per
  driver and show buses or drivers, not both.
- **The roster becomes a rail, always open on the Mac's board.** Closed, it
  is the name column alone, 7.5rem, each driver's head as now: the name,
  what Samsara's clock says and the most urgent mark. The toolbar loses its
  Driver availability toggle.
- **The rail stands left of the board, a card of its own beside it.** The
  right is the editor's, and a rail there would stand between the week and
  the trip being edited. Its rows are not the bus rows, so the board's gap
  parts them rather than a rule that would set a driver beside a bus as if
  they belonged together; its head stands level with the board's toolbar
  and its Driver row with the day band, so the two read as one workspace.
- **The other left panels open left of the rail,** Tasks, Departures, Forms
  and the rest, so the rail always stands next to the board. The rail is
  counted in the sum `data.js` makes of the week's minimum and the open
  panels, at its closed width and its gap, 8.5rem, and not in the two
  panels beside the week. It is never closed for room, as the editor is
  not. Where a panel needs room, the rail's open week folds back first, and
  only then does the oldest panel close, as now. On a laptop's 77rem board
  the rail, the week and one list fit, or the rail, the week and the
  editor, but not a list and the editor together, which the roster closed
  allows now: opening a trip closes the list.
- **A chevron in the rail's head opens the week:** the seven squares of the
  week in view slide out beside the names, the roster's grid as it is,
  21.5rem in all, and the chevron turns to close them. It moves as Carbon's
  side panel does, `design/docs/motion.md`'s expansion, and the browser
  keeps whether it was open, as it keeps the view's options.
- **The phone's board has no rail.** Its half sheet and live card carry the
  drivers as now.
- **A driver's state leaves the bars for their head.** A bar out on the road
  draws its seats as a planned bar does, each name with its answer, and the
  driver at the wheel keeps the steering wheel's mark and first place, since
  who drives this bus now is the trip's. The duty mark, the hours-left meter
  and the rest meter go: the head's line says them, "6:21 left", "SB 3h".
- **The trip's problems stay on the bar,** in its times row as now: Wrong
  bus, a driver at the wheel the trip does not name, and Short on hours for
  the driver at the wheel, live-trip.js's warnings.
- **The detail stays where it is opened.** The live card and the bar's
  driver tip keep the three clocks and the rest meter, and the driver's card
  gains them.
- **A press on a driver's mark or their line opens their card,** as a bar's
  marks open its tips; a press on the name picks out their trips. The mark
  and the line become buttons inside the name's cell, as a bar's marks are
  inside the bar.
- **The driver's card** is the bar's driver tip with nothing about one
  trip: their photo or initials, name, priority and Part-time, what they
  are doing now with their three clocks and the rest meter, phone,
  language, licence and medical dates, each mark's words with its action,
  Tell or Send trips, their next trip, and Call in its footer. It is drawn
  in `scheduler/trip-tips.js` beside the bar's driver tip, sharing its head,
  and floats as the bar's tips do, over the rail and the board. This
  replaces the inventory's "Driver card, later" row.
- **Both menus gain Away, after Reach:** **Mark out of service…** for a bus
  and **Add time off…** for a driver, before Send trips.
- **Away is set from the board in the record pages' own dialog.** The time
  off dialog in `drivers.js` and the out-of-service form in `fleet.js` move
  to one shared file, which the record pages and the board both open, so
  each is written once and saving from the board saves as the page does.
- **Away keeps its two drawings,** the stripes on a bus's row and the red
  cell in the roster.
- **A driver on a bar has a seat menu,** from a right-click or a hold on
  their name in a seat. It does not open the trip's menu, because the name
  is the thing pressed. Its items, in this order:
  1. **Open driver**, then **Call** and **Text**, as the roster's menu has
     them.
  2. **Remind**, or **Tell** while the leg has changed for them since they
     said yes, as the Contact list offers them, asking first as it does.
  3. **Their answer:** the answers dispatch can set on the Buses tab, saved
     at once with the source set to dispatch.
  4. **Move to seat**, listing the bus's other seats that are turned on,
     which does what dropping them on that seat does.
  5. **Take off this bus**, which asks first when they have been sent the
     trip or have confirmed it, as Remove driver does, and offers Undo as
     the drop does.
  It is hidden on the trip open in the editor, as the bar's menu is.

## Questions

- **Does the closed rail say who is free for the selected trip?** With a
  trip selected, the open week draws a green slot across its days for each
  driver free for all of them. Closed, a green check beside those drivers'
  names could say the same, so finding a driver seldom needs the week
  opened. My pick is yes, the check in the mark's place before the name,
  the mark coming back when the trip is put down.

## Tasks

- [ ] Make the roster a rail always open left of the Mac's board, a card of
      its own level with the board's toolbar and day band, closed to its
      names, with the chevron that opens the week, kept by the browser; take
      Driver availability out of the toolbar, and count the rail in the
      panels' sum as the decision says, its week folding first.
- [ ] Draw a road bar's seats as a planned bar's, the wheel's mark kept, and
      take the duty mark and the hours and rest meters off it, in
      `scheduler/road-bar.js`, `tools/check-bar.mjs` and the components
      page's samples.
- [ ] Add the driver's card to `scheduler/trip-tips.js`, opened by a press
      on the mark or the line in a driver's head, and draw it in
      `tools/check-bar.mjs`.
- [ ] Move the time off and out-of-service dialogs into one shared file, open
      it from the Drivers and Fleet pages, and add Away to both menus.
- [ ] Add the seat menu for a driver's name on a bar, opened by a
      right-click or a hold, out of the way of the drag that carries a
      driver off a bar.
- [ ] Correct `scheduler/docs/screen-inventory.md` as each lands: the driver
      availability grid, the bar out on its trip, the Driver card row and
      the Assign driver menu.
