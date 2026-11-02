---
type: plan
---

# Plan: The scheduler's board on a phone

## Goal

On a phone the board says what is going on today and tomorrow at a glance,
and everything else is one tap away. It is the Mac's board, narrowed: the
same strip of days, the same bus headers and the same trip bars, two days
wide, swiped with the iPhone's own fling. A trip bar says only what a row
is scanned for, and a tap opens the rest in a sheet with its actions in
thumb reach.

Today the phone shows the strip two days wide, a flick a day, its trips
three lines beside a narrow bus column, a tap on a trip opening its sheet
and a tap on a bus the bus's; the editor opens over the board as the Mac's
form.

## Decisions

- **The phone's board is the strip, two days wide,** as rux decided from
  the mockups: the bus column and two days fill the board, about 150px a
  day beside the narrow bus column. It is swiped a day at a time and rests
  on a day's edge. Turned sideways, it shows as many days as fit.
- **A trip bar is three lines,** as rux decided: the destination, with its
  bus count, its warning mark and its colour; its times out and back; and
  its driver, or the words for none. The customer, the contact, the latest
  update, the trip's kind and a driver's rest are left to the trip's sheet,
  and a thin line along a bar's foot says its bus is on the road.
- **A tap anywhere on a trip opens its sheet;** nothing inside a bar is a
  target of its own on a phone, since its marks are too small for a thumb.
- **The trip's sheet** rises from the foot: Call, Text, Route and Open as
  large buttons; the customer, the contact with the number, the drivers and
  the latest update; and Move to bus and Change driver, so a trip changes
  bus or driver with no drag. A drag still works. As rux decided, Call and
  Text reach the booking contact, Route shows the stops and times in the
  sheet, Itinerary, Forms and Contacts stand in a smaller row with Move to
  bus and Change driver, and Move to bus lists the free buses first and the
  busy ones greyed.
- **The bus column is about 62px:** the number, running or off with the
  speed, and the fuel; the seats, the sleeper and the lift go to the bus's
  sheet, which a tap on the bus opens.
- **The bus's sheet holds everything about the bus,** as rux decided:
  running or off with the speed and where it is, fuel and DEF, seats,
  sleeper and lift, its trips for the two days, and any time out of
  service.
- **Above the board,** the month, which picks a month, Today and search,
  with no arrows, a swipe being the step; under them the week, the two days
  in view marked and a dot under each day with a trip carrying a warning
  mark, as rux decided, a tap on a day going to it.
- **At the foot, a bar of places: Board, Drivers, Live map and Search,** as
  rux decided, built from Design's `frame-bar`; Tasks, Departures, Forms,
  Contacts and the settings are in the ☰ menu. A round + at the bottom
  right starts a new trip, the scheduler's own, Carbon having no floating
  button.
- **Every task is measured before and after** in Chrome on :8641 on a real
  week, a swipe's frames and a sheet's opening, with the numbers in the
  commit message, **and checked in the iPhone simulator,** held both ways.

## Questions

None open.

## Tasks

- [ ] Put the month, Today and search above the board, with the week under
      them.
- [ ] Add the bar of places at the foot and the + for a new trip.
- [ ] Show as many days as fit with the phone turned sideways.
