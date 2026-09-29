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

- **Items follow the order the work happens,** in five groups, and only the
  items a leg needs are shown:
  - **Quote:** the route complete, the calculator's price on the Billing tab,
    every billing line the trip needs, and the quoted price marked sent. The
    rules are the next decision.
  - **Customer:** confirmed, as the trip's Confirmed setting and the
    follow-up reminders read it, itinerary received, trip contact.
  - **Buses and drivers:** every bus assigned, every seat filled, the bus has
    what the trip needs (lift, 56 seats, sleeper), every driver confirmed.
  - **Paperwork:** itinerary printed, an envelope printed for each driver, and
    the hours-of-service record printed where a part-time driver is on the bus.
  - **Extras:** hotel booked, fuel card assigned, each with its number.
- **The Quote items tick themselves from what the editor already checks:**
  - **Route complete:** every stop has a place, no leg says Needs times or
    Check times, the drives are measured, and no stop is dated outside its
    leg.
  - **Price from the calculator:** the leg has a Bus rental line whose miles
    are the route's miles now, so a route changed after pricing unticks it.
  - **Billing lines complete:** a Second driver line for each co-driver seat,
    a Relief driver line for each relief seat, and a Hotel line when the trip
    needs a hotel. A discount is optional and never asked for.
  - **Quoted price confirmed:** Quote sent is marked, at the price the lines
    add up to now; when the lines move past it, it unticks and says by how
    much, as the Billing tab already does.
- **A placeholder shows only the Quote group,** since quoting it is the work
  left; the other groups start once the quote is sent.
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
  which opens the Checklist tab.
- **The Departures list** is a panel beside the board, opened like Forms, so
  the week stays in view. It shows the legs leaving today and the next 2 days,
  grouped by day, legs with items left first and Ready ones folded under them.
  Each leg lists only its open items, with their buttons.
- **When every driver on a leg is past Not sent,** the scheduler also ticks
  rux-ui's `driver_contact_sent_<leg>`, and unticks it if one goes back, so
  rux-ui's Tasks list stays in step.
- **Nothing after the trip for now:** the survey and incident notes stay in
  rux-ui.
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

- **Does the bar show what is left?** Three choices were mocked up: nothing
  on the bar, three dots for route, price and billing, or a "2 left" chip that
  shows only while something is missing. The chip is the recommendation,
  because a finished trip's bar stays as it is today.

## Tasks

- [ ] Write `checklist.js` with every item's rule, the Quote group's reusing
      the Route tab's Needs times and No location checks and the Billing tab's
      quote-sent comparison, and a test that runs it against sample trips.
- [ ] Keep `driver_contact_sent_<leg>` in step with the drivers' statuses.
- [ ] Add the Checklist tab to the trip editor, with the fuel card box and
      its number.
- [ ] Put the Printed box back in the form panel, beside Print, for the
      envelope, itinerary and hours-of-service record.
- [ ] Add the "left" line to the trip's card on the board.
- [ ] Build the Departures panel.
- [ ] Update `scheduler/docs/screen-inventory.md` and the scheduler README.
- [ ] Check every item in Chrome on :8641 against a real trip, one with a
      return leg and a part-time driver among them.
