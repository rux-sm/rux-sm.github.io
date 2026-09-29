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
  - **Entered:** the Route, Buses and Billing tabs each marked Done, the
    decisions below.
  - **Customer:** confirmed, as the trip's Confirmed setting and the
    follow-up reminders read it, itinerary received, trip contact.
  - **Buses and drivers:** every bus assigned, every seat filled, the bus has
    what the trip needs (lift, 56 seats, sleeper), every driver confirmed.
  - **Paperwork:** itinerary printed, an envelope printed for each driver, and
    the hours-of-service record printed where a part-time driver is on the bus.
  - **Extras:** hotel booked, fuel card assigned, each with its number.
- **Route, Buses and Billing each end with a Done button,** pressed by a
  person after going back over that tab. It keeps who pressed it and when,
  enters the trip's history, and puts a check on the tab's name. The
  calculator belongs to Billing, because its work is the billing lines.
- **Done can be pressed only when its tab is complete,** never with an item
  open, since an item a trip does not need is already left out. Until then
  the button names what is missing:
  - **Route:** every stop has a place, no leg says Needs times or Check
    times, the drives are measured, and no stop is dated outside its leg.
  - **Buses:** every bus the trip needs is assigned, and each has what the
    trip needs (lift, 56 seats, sleeper).
  - **Billing:** a Bus rental line whose miles are the route's miles now; a
    Second driver line for each co-driver seat, a Relief driver line for each
    relief seat, and a Hotel line when the trip needs a hotel, a discount
    being optional; and Quote sent marked at the price the lines add up to.
- **A saved change takes Done off the tabs it affects,** so a check always
  means the trip as it stands was gone over:
  - a change to the route or the trip's dates clears Route and Billing,
    because the price follows the miles and days;
  - a change to the buses or their co-driver and relief seats clears Buses
    and Billing, because the price follows the buses and drivers;
  - a change to a billing line, the quoted price or Quote sent clears
    Billing alone.
  Naming a driver, recording a deposit, PO or payment, and editing the
  Details tab clear nothing. The update window every Save opens says which
  checks the save takes off, before it is saved.
- **The bar shows a check when all three are Done, and nothing otherwise,**
  so a quote sent early does not make its bar look wrong.
- **A placeholder shows only the Entered group,** since entering it is the
  work left; the other groups start once the quote is sent.
- **Nothing is blocked.** A quote can be sent, and a trip saved, with tabs
  not yet Done; the checklist only says what is left, in any order.
- **Done is kept in six columns on `trips`,** a time and a name per tab, as
  `scheduler/docs/database-inventory.md` lists them; rux-ui writes only the
  columns it changed, so it leaves them alone.
- **The database clears Done, not the editor,** so a change made in rux-ui or
  by hand clears it too; its triggers take off the Done each change affects,
  as above, and reordering buses, a no-op write, and an update that sets a
  Done itself clear nothing. The editor therefore writes
  Done in one last update after the trip's rows, and reads `updated_at` back
  after it, so its own save is not taken for a change made elsewhere.
- **Done is part of the editor's unsaved changes,** like any field: pressing
  it checks the tab at once, Save writes it, and Reset takes it back. A change
  on a tab clears its check, and Billing's, the moment it is made, so a tab
  changed and then marked Done again in one sitting saves as Done.
- **What the trip already knows ticks itself.** Customer items, buses, seats
  and equipment come from the trip. "Drivers confirmed" comes from each
  driver's status (Not sent, Pending, Confirmed), so there is no separate
  "driver contact sent" box to keep in step with it.
- **Only the paperwork and the extras are ticked by hand,** and each is ticked
  where the work happens: a Printed box beside Print in the form panel, the
  hotel's Booked box the editor already has, and a new fuel card box with its
  number, which the scheduler lacks today. The Checklist tab ticks the ones
  kept on the trip; an envelope is ticked in the Forms panel, since it is one
  per driver's seat.
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
  `follow-up.js` is shared today. The board hands it each leg's buses and
  seats, which only the board can read. The Checklist tab reads the trip as
  saved, with the editor's own Done marks and ticks laid over it.
- **Follow-up reminders stay as they are.** They are about chasing the
  customer; the checklist is about getting the leg out the door.

## Questions

None open.

## Tasks

- [ ] Keep `driver_contact_sent_<leg>` in step with the drivers' statuses.
- [ ] Put the Printed box back in the form panel, beside Print, for the
      envelope, itinerary and hours-of-service record.
- [ ] Make Route's Done check both legs of a split trip; today it checks the
      leg on screen.
- [ ] Build the Departures panel.
- [ ] Update `scheduler/docs/screen-inventory.md` and the scheduler README.
- [ ] Check every item in Chrome on :8641 against a real trip, one with a
      return leg and a part-time driver among them.
