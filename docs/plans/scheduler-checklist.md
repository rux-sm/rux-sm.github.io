---
type: plan
---

# Plan: a trip checklist in the scheduler

## Goal

Each leg of a trip has one checklist saying what is still to do before it
leaves, and a Departures list shows every leg leaving soon with what it still
needs. Most items tick themselves from what the trip already records; the few
that cannot are ticked where the work is done, like right after printing a form.

## Decisions

- **Items follow the order the work happens,** in four groups, and only the
  items a leg needs are shown:
  - **Customer:** confirmed, as the trip's Confirmed setting and the
    follow-up reminders read it, itinerary received, trip contact.
  - **Buses and drivers:** every bus assigned, every seat filled, the bus has
    what the trip needs (lift, 56 seats, sleeper), every driver confirmed.
  - **Paperwork:** itinerary printed, an envelope printed for each driver, and
    the hours-of-service record printed where a part-time driver is on the bus.
  - **Extras:** hotel booked, fuel card assigned, each with its number.
- **What the trip already knows ticks itself.** Customer items, buses, seats
  and equipment come from the trip. "Drivers confirmed" comes from each
  driver's status (Not sent, Pending, Confirmed), so there is no separate
  "driver contact sent" box to keep in step with it.
- **Only the paperwork and the extras are ticked by hand,** and each is ticked
  where the work happens: a Printed box beside Print in the form panel, the
  hotel's Booked box the editor already has, and a new fuel card box with its
  number, which the scheduler lacks today. The checklist can tick them too.
- **Every item that is not done has one button to go do it:** open the form,
  the Buses tab, the driver's status, the upload.
- **An item a trip does not need is left out,** not shown as "not needed":
  no hotel row on a day trip, no hours-of-service row without a part-time
  driver. The trip's existing "not needed" switches for itinerary and contact
  keep working and remove those rows.
- **A leg is Ready when nothing is left.** Ready is worked out each time and
  never saved.
- **The checklist is a Checklist tab in the trip editor,** one section per leg
  for a trip with a return, beside Details, Route, Buses, Billing and Files.
- **The trip's card on the board says what is left,** as one line, "3 left",
  which opens the Checklist tab. The bar itself gains nothing, because it is
  already full.
- **The Departures list** shows the legs leaving from today onward, grouped by
  day, legs with items left first and Ready ones folded under them. Each leg
  lists only its open items, with their buttons.
- **The ticks are the columns rux-ui already writes,** so a tick in either app
  shows in both: `itinerary_printed_<leg>`, `hos_form_printed_<leg>`,
  `hotel_booked_<leg>` and `fuel_card_assigned_<leg>` with their numbers on
  `trips`, and `envelope_printed` on each driver's seat. No database change.
- **One rules file, `scheduler/checklist.js`,** decides every item, and the
  editor tab, the card and the Departures list all read it, the way
  `follow-up.js` is shared today.
- **Follow-up reminders stay as they are.** They are about chasing the
  customer; the checklist is about getting the leg out the door.

## Questions

- How far ahead should Departures look: today and the next 2 days, or the
  whole week on screen?
- Should Departures be a panel beside the board, like Forms, or its own page
  in the side menu, like Trips?
- Should the checklist also cover after the trip, like the survey sent and any
  incident, as rux-ui's post-trip list does, or leave that for later?
- rux-ui has a "Driver contact info sent" box per leg. When every driver on a
  leg is past Not sent, should the scheduler tick that box too, so rux-ui's
  list agrees?

## Tasks

- [ ] Write `checklist.js` with every item's rule, and a test that runs it
      against sample trips.
- [ ] Add the Checklist tab to the trip editor, with the fuel card box and
      its number.
- [ ] Put the Printed box back in the form panel, beside Print, for the
      envelope, itinerary and hours-of-service record.
- [ ] Add the "left" line to the trip's card on the board.
- [ ] Build the Departures list where the answer to the second question puts it.
- [ ] Update `scheduler/docs/screen-inventory.md` and the scheduler README.
- [ ] Check every item in Chrome on :8641 against a real trip, one with a
      return leg and a part-time driver among them.
