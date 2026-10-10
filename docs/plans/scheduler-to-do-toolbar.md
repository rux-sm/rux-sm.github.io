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

- **Two buttons in the board's toolbar, Tasks then Prep, ahead of Search,**
  because each opens a pane of the board as Driver availability does, and
  Carbon keeps the header for the whole site's functions.
- **Both open the one pane, each on its own list.** The pane has no switch:
  its head is the list's name and the close control, and a press on the open
  list's button shuts it.
- **An open list's button has its glyph filled,** as Driver availability's is.
- **The count is Design's count badge on the button,** placed by a rule in
  `scheduler/overrides.css` to stand clear of the glyph, because Carbon's own
  placing covers it at the toolbar's button size.
- **Where the toolbar has no room for its controls, the ones between the
  week and ⋮ scroll sideways,** on a phone and in a narrow window alike,
  because one rule serves both and no control moves into a menu for it.
- **The week, ⋮ and New trip hold still,** so the week's calendar opens whole
  and the menu is always in reach.
- **Tasks and Prep come ahead of Search in that row,** so the two counts show
  before a swipe.
- **A mouse wheel over the row scrolls it sideways,** because a mouse has no
  swipe.
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

None open.

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
- [ ] Put the controls between the week and ⋮ in one strip in
      `scheduler/index.html` and scroll it sideways in `scheduler/app.css`
      wherever it does not fit, the week picker left outside it so its
      calendar is not cut, and the badge inside it so the scroll does not cut
      that; turn a wheel over it into a sideways scroll in
      `scheduler/data.js`.
- [ ] Measure the toolbar at its tight width and on the iPhone simulator, in
      a light theme and a dark one, and set what stands whole before a swipe.
- [ ] Take the To do action, its panel and the list's scripts off every
      Scheduler page but the board and the Trips page, which keeps
      `to-do-rows.js`; take the header panel's rules out of
      `scheduler/app.css`.
- [ ] Rewrite the To do row of `scheduler/docs/screen-inventory.md`, where
      the list is in the `inbox-review` skill, the header line of
      `scheduler-chat.md` and the To do list's pages in `scheduler-fixes.md`,
      each in the commit that changes what it describes.
