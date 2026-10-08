---
type: plan
---

# Plan: Departures, what each trip leaving tomorrow still needs

## Goal

One panel shows every trip leaving on a day, tomorrow first, with the state of
each step that gets it ready: done, when and by whom, or still to do. A trip
that is ready stays in it, so the office can see that everything was done and
not only what is missing.

## Decisions

- **It is called Departures,** and it takes the place of the board's
  Departures list, so there is one place and not two.
- **It opens from the To do list,** from a line at the list's top such as
  "Tomorrow: 2 of 4 ready", and a back arrow returns to the list. A phone's
  header has no room for another action.
- **That line is one row of Today** while a trip leaving tomorrow is not
  ready, so the To do count carries it.
- **It opens on tomorrow.** An arrow each side of the day steps a day back or
  forward, and a press on the day opens a calendar, so the office can get
  ahead or look back at this morning.
- **A tab per leg leaving that day,** named by its place, with a green tick
  when it is ready or how many lines are left. A ready one keeps its tab.
- **A split trip's two legs are two tabs, each on its own day.** The later
  leg has its own steps, and finds what is the whole trip's, such as Driver
  info sent, already done.
- **One trip is one page of the panel:** a tile for the trip, then a tile for
  each bus.
- **Every status is one line, read the same way:** a mark, what it is, then
  when it was done or the word for doing it. The marks line up on the left
  and the times and actions on the right.
- **Three marks only.** A green tick is done, a red X is the office's to do,
  and a yellow warning is a problem sorted out somewhere else.
- **The trip's tile holds what belongs to the whole trip:** Confirmed, with
  its PO; Itinerary received; Trip contact, with the name; Balance due, only
  when there is one; and Driver info sent, to the booking contact by name.
- **A bus's tile holds its number, a badge for each thing the bus needs,**
  green where the bus has it and red where it does not, and how many lines it
  has left.
- **Each crew member has lines under their name and role:** Confirmed first,
  then Itinerary, Envelope, Reminder, and HOS form for a part-time driver,
  who also wears a Part-time badge.
- **Itinerary and HOS form are a driver's,** as the envelope is, because each
  driver is handed their own.
- **A fuel card is a bus's,** one for each bus on the trip, with its number.
- **A seat given to another driver starts its steps again,** because the
  envelope and the reminder were the other driver's.
- **A tile's count is every line of its that is not done,** warnings among
  them, and the tab's count is its tiles' added up.
- **The panel only shows status.** Nothing is ticked in it.
- **A step is marked where it is done.** After a print on the Forms page, or
  after Remind or Driver info in the trip's Contact list, the page asks
  whether to mark it, naming the driver: "Mark Maria's envelope as printed?"
  Yes stores the mark, the time and who; No stores nothing, so a cancelled
  print or an unsent text stays to do.
- **A line still to do goes to that place** on a press of its action word:
  the Forms page on that driver's form, or the trip's Contact list.
- **A wrong Yes is taken back where it was given,** by the Printed tick the
  Forms page has and one like it beside Remind and Driver info.
- **A done line says when and shows who,** as a small face. A step marked
  before the times were kept shows its tick alone.
- **What the trip already knows marks itself:** the bus's badges, Confirmed,
  Itinerary received, Trip contact and Balance due are read from the trip, as
  the checklist reads them.
- **The Done marks of the Route, Buses and Billing tabs are not shown,**
  because they are open on nearly every trip and would say nothing here.
- **Nothing here is kept in step with rux-ui,** which is retired. The leg's
  own itinerary and HOS columns on the trip are left as they are and no
  longer read; the checklist reads each driver's marks.
- **When and who are stamped by the database,** as a step is turned on, so
  neither app can give a step a time it was not done at.
- **Driver info sent is kept beside the trip, in `trip_prep`,** so marking it
  never moves the trip's own row under an open editor.
- **The rules are one file, `scheduler/departures.js`,** run against sample
  trips in the check, handed each leg's buses and seats by
  `scheduler/leg-facts.js` as the checklist and the to-do list are.

## Questions

None open.

## Tasks

- [ ] Have the checklist read the itinerary and the HOS form from each
      driver, in the commit that makes the Forms page mark them there.
- [ ] Give each bus its own fuel card: the SQL shown to rux, and the card
      entered in the bus's window on the Buses tab.
- [ ] Ask after a print on the Forms page whether to mark it, and store a Yes.
- [ ] Ask after Remind and Driver info in the Contact list, store a Yes, and
      give each a tick to take it back.
- [ ] Build the panel: the day and its arrows, the tabs, the trip's tile and
      the buses' tiles, at desk and phone widths in each theme.
- [ ] Add the line at the top of the To do list that opens it.
- [ ] Take the board's Departures list and its menu item out.
- [ ] Bring `scheduler/docs/screen-inventory.md` and
      `scheduler/docs/database-inventory.md` in line, in the commits that
      change what they describe.
