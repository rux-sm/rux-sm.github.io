---
type: plan
---

# Plan: Tasks and Prep in the board's toolbar

## Goal

The office sees two lists on the board, each with its own count: what people
have asked of it, and what the trips still need. Each is one press from the
week's toolbar, and nothing is counted twice.

## Decisions

### Two lists

- **Tasks is what people ask of the office:** the stored rows, written and
  agent, with their groups, Done today and Add a to-do unchanged.
- **Prep is what the trips still need, soonest first.** It joins the Alerts
  and Prep tabs, because both are worked out from the trips and end when the
  trip is fixed.
- **Each day is one heading.** A day to prep for holds every leg leaving on
  it as the tile Prep has; any other day holds one row for each trip with a
  gap.
- **A row is a trip, once:** its place and customer, then every gap on one
  line, and a press opens the trip.
- **A leg on a day to prep for has no row,** because its tile says the same
  thing; the tile gains a No times line, the one gap it does not say.
- **A follow-up that is not due leaves the list** and stays the Trips page's
  Needs follow-up choice, because a line that stands for every waiting trip
  is not one to act on.
- **Nothing folds.** One row for each trip in day order puts a crowd at the
  far end of the list, where it is out of the way.
- **Each count says one thing once.** Tasks counts its Overdue and Today
  rows. Prep counts the legs not ready on the days to prep for, and its rows.
- **The arrows and the calendar still go to any one day,** which then shows
  alone, as tiles.

### Where they are

- **Two buttons in the board's toolbar, after Search and before Driver
  availability,** because each opens a pane of the board as Driver
  availability does, and Carbon keeps the header for the whole site's
  functions.
- **Both open the one pane, each on its own list.** The pane has no switch:
  its head is the list's name and the close control, and a press on the open
  list's button shuts it.
- **An open list's button has its glyph filled,** as Driver availability's is.
- **The count is Design's count badge on the button's corner,** placed by a
  rule in `scheduler/overrides.css`, because Carbon's own placing covers the
  glyph at the toolbar's button size.
- **The lists are on the board only.** The other Scheduler pages lose the
  header action and its panel, because a task's Trip button and a Prep line's
  Print already lead to the board.
- **The Trips page keeps its Show choices,** so reading the trips and working
  out their rows moves to a file of its own that the board and that page load.
- **The header keeps Carbon's order,** and holds the account and the switcher
  alone.

### Left as it is

- **The pane's place,** left of everything, in front of the week where the
  window has no room, and shut when the board opens.
- **A task's row and a Prep tile,** each as drawn.
- **The rules in `scheduler/to-do.js`,** apart from `fold`, and the
  connector's To do tools.

## Questions

- **What is the second list called?** Prep is recommended, because the side
  nav already has a page named Trips.
- **Which two controls give way where the toolbar is tight, and on a phone?**
  Tasks and Prep take the room of two buttons. Search and Driver
  availability are recommended to become rows of the ⋮ menu there, as Today
  and New trip do, because a menu row cannot show a count.
- **Does the chat box follow?** `scheduler-chat.md` puts it in the header
  beside To do. Leaving it there is recommended, because it is asked from
  every Scheduler page.
- **Where does this sit among the plans?** After the Small fixes and Checks
  groups of `scheduler-fixes.md` is recommended, ahead of its Clashes group,
  which adds a kind to these lists.

## Tasks

- [ ] In `scheduler/to-do.js`, add the rows of one trip as one row, leaving
      out the days to prep for and the follow-ups not due, and the two
      counts; take `fold` out; add cases to `scheduler/tools/check-to-do.mjs`.
- [ ] Add the No times line to a leg's page in `scheduler/departures.js`,
      with a case in `scheduler/tools/check-departures.mjs`.
- [ ] Move reading the trips and working out their rows from
      `scheduler/to-do-list.js` into `scheduler/to-do-rows.js`, and read it
      from `scheduler/trips.js`.
- [ ] Draw Prep as one list in `scheduler/departures-panel.js`: tiles on the
      days to prep for, rows on the others, each day under one heading.
- [ ] Cut `scheduler/to-do-list.js` to Tasks: no switch, no Alerts, and the
      pane's head named for the list showing.
- [ ] Add the two buttons to the toolbar in `scheduler/index.html`, each with
      its count and its filled glyph while open; place the badge in
      `scheduler/overrides.css`; take the To do action out of the header.
- [ ] Give way in the tight toolbar and on the compact board as the answer
      above says, in `scheduler/data.js` and `scheduler/app.css`, and measure
      both in a light theme and a dark one.
- [ ] Take the To do action, its panel and the list's scripts off every
      Scheduler page but the board and the Trips page, which keeps
      `to-do-rows.js`; take the header panel's rules out of
      `scheduler/app.css`.
- [ ] Rewrite the To do row of `scheduler/docs/screen-inventory.md`, where
      the list is in the `inbox-review` skill, the header line of
      `scheduler-chat.md` and the To do list's pages in `scheduler-fixes.md`,
      each in the commit that changes what it describes.
