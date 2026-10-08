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
- **A tab per trip leaving that day,** named by its place, with a green tick
  when the trip is ready or how many lines are left. A ready trip keeps its
  tab.
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
- **rux-ui keeps reading what it reads.** Its Tasks list uses the yes and no
  columns for a printed itinerary, an envelope and a reminder, so those are
  still written beside the new times.
- **The rules are one file, `scheduler/departures.js`,** run against sample
  trips in the check, handed each leg's buses and seats by
  `scheduler/leg-facts.js` as the checklist and the to-do list are.

## Questions

- A drop-off and pickup trip has two legs on different days. Is each leg its
  own tab on the day it leaves?
- On a trip with two buses, does each bus carry its own fuel card and number,
  or is there one for the trip?

## Tasks

- [ ] Read how rux-ui's Tasks list writes the reminder, the envelope, the
      printed itinerary and the driver contact columns, so both apps agree on
      what a tick means.
- [ ] Write the SQL for each step's time and who, a driver's own itinerary
      and HOS marks, the reminder, and Driver info sent for a leg; show it to
      rux, and apply it as a named migration on a yes.
- [ ] Write `scheduler/departures.js` and `scheduler/tools/check-departures.mjs`
      with sample trips, in the check.
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
