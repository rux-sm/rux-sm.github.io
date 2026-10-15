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
  with no driver, no actual miles, no invoice and an unpaid balance.
- **The invoice and the payment are asked for in the scheduler,** because the
  office enters both there after QuickBooks makes them. The invoice is
  billing.js's invoiced rule, and is not asked for when the billing workflow
  turns its invoiced step off; the payment is the balance follow-up.js
  already asks for.
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
- **A trip closes itself once nothing is missing.** Nothing is stored and no
  one presses anything; it asks only while something is true, as follow-ups
  do.
- **A leg a bus from another company drove** is answered by an Actual miles
  typed by hand, and its bus waits on the farm-out mark the status list
  names; until that mark exists, the leg asks for a bus.

## Questions

## Tasks

- [ ] Tick Read Vehicle Trips on the Samsara key (rux, in Samsara), which
      samsara-miles needs to say who drove.
- [ ] Teach samsara-miles who drove each bus, with its check, and deploy it on
      rux's yes.
- [ ] Add Check with Samsara's drivers and differences beside Get from
      Samsara on the Billing tab, and prove a Save in Chrome on :8641 by
      `scheduler/docs/proving-a-save.md`.
- [ ] Say who drove in the samsara-miles section of
      `scheduler/docs/database-inventory.md`.
