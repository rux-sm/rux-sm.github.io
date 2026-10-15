---
type: plan
---

# Plan: Close out a trip once it is back

## Goal

A trip that has happened stops moving by accident and asks only for what its
record still lacks: who drove, which bus went, how far, and the money. Samsara
fills what it knows, so closing a trip out is mostly one check and a Save.

## Decisions

- **A trip is back once its last leg's yard-back has passed,** read as McAllen
  time, as the bar's live line reads it; with no times, after the late-return
  hour following its last day.
- **A trip that is back cannot be dragged on the board.** Its bar does not
  move to another bus, and no driver is pulled out of it or dropped into it.
  The trip editor still changes anything, because real corrections happen.
- **Saving a change to a trip that is back asks first** when the change
  touches its buses, drivers, dates or stops: "This trip already happened.
  Save the change anyway?" Billing, files and updates never ask, because
  they are what closing out fills in. History already records who changed it.
- **Once a trip is back, its card and bell stop asking before-trip
  questions:** the trip contact, the hotel, the hours-of-service form, a bus
  that does not fit, the confirmation, the PO and the itinerary. The balance
  stays, as follow-up.js already keeps it.
- **They ask the close-out questions instead:** a leg with no bus, a seat
  with no driver, and no actual miles; and the invoice and the payment, if
  the questions below keep them.
- **Check with Samsara fills what it can,** through samsara-miles, which also
  starts saying who drove each bus, from Samsara's own trips for the vehicle.
  It shows each bus's miles and drivers beside the trip's, fills Actual miles,
  and says where they differ, such as a driver on the trip Samsara never saw
  in the bus; it changes no bus or driver by itself, and Save writes.
- **Only trips that end on or after the day this ships are asked,** a date
  fixed in the code, so this year's older trips raise nothing; 565 of them
  would otherwise ask at once.
- **The close-out rules live in one file,** `scheduler/close-out.js`, which the
  board, the card and the Trips page share, as they share follow-up.js.
- **The Trips page gets a To close filter** beside Past, listing the trips
  that are back and still ask something.

## Questions

- **Are invoices and payments kept in the scheduler, or only in QuickBooks?**
  This year 497 past trips have no invoice in the scheduler and 538 are not
  marked paid. If QuickBooks alone keeps them, close-out leaves both out.
- **Does a trip close itself once nothing is missing, or does someone press
  Close out?** Closing itself needs no new column and asks only while
  something is true, as follow-ups do. A button keeps a mark of who closed it,
  which is a database change. Recommended: it closes itself.
- **What closes a leg a bus from another company drove,** which has no bus of
  ours and no Samsara miles? Recommended: an Actual miles typed by hand
  answers the miles, and the leg waits on the farm-out mark the status list
  already names, rather than asking for a bus forever.

## Tasks

- [ ] Tick Read Vehicle Trips on the Samsara key (rux, in Samsara), which
      samsara-miles needs to say who drove.
- [ ] Write `scheduler/close-out.js`: when a trip is back, what it still asks,
      and the date asking starts; with a check of its own beside the other
      rules in `scheduler/tools/`.
- [ ] Stop the board's drag and driver carry for a trip that is back, in
      `scheduler/data.js`.
- [ ] Ask before Save when a change to a trip that is back touches its buses,
      drivers, dates or stops.
- [ ] Swap the card's and bell's before-trip questions for the close-out ones
      once a trip is back.
- [ ] Teach samsara-miles who drove each bus, with its check, and deploy it on
      rux's yes.
- [ ] Add Check with Samsara's drivers and differences beside Get from
      Samsara on the Billing tab, and prove a Save in Chrome on :8641 by
      `scheduler/docs/proving-a-save.md`.
- [ ] Add the To close filter to `scheduler/trips.html`.
- [ ] Describe close-out in `scheduler/README.md` and the samsara-miles
      section of `scheduler/docs/database-inventory.md`.
