---
type: plan
---

# Plan: The scheduler's board on a phone

## Goal

On a phone the board says what is going on today and the next day at a
glance, and a trip, its itinerary, its driver or its customer is a tap or
two away. It stops being the Mac's board narrowed: it is two days of buses,
moved a day at a time, as the iPhone's Calendar shows two days, and a
tapped trip opens a half sheet over the view rather than a sheet that takes
the screen.

Today the phone has the two days, with search and + in the header, the
month and Today in the toolbar and the week row under it; a swipe moves the
days one day, a tap on a trip opens the half sheet, pulled up for the rest
with its Bus and Driver rows, a tap on a bus opens the bus's sheet, and the
editor opens over the board as the Mac's form.

The mockup rux chose the half sheet from is `design/m/phone-peek.html`,
local and unpublished, served on :8641.

## Decisions

- **Two days is the phone's only view, a bus a row,** as rux decided, as
  the iPhone's Calendar shows two days: a trip over several days one bar
  across them, an empty row a free bus, the trips with no bus in a row of
  their own at the foot, and a tap on a bus opens the bus's sheet.
- **A swipe moves the days one day,** as rux decided: the days follow the
  finger and settle on the next day or back on this one, a swipe that
  starts up or down never moves them sideways, and they always come to
  rest on a day's edge.
- **The week row is the iPhone Calendar's,** under the month: each day its
  letter over its date, the two days in view one pill, a dot under a day
  where a trip needs attention, and a tap going to that day.
- **A tapped trip opens a half sheet,** as rux decided, over the bottom
  half with the view still showing above it and the trip marked in it:
  where, the customer and times, what is happening now, the bus and the
  driver, and three large buttons, Itinerary, Call or text, and Route. A
  tap on another trip moves the sheet to it. Its handle pulls it to the
  top for the customer, the contacts, the pickup, the newest update and
  Edit trip, the view dimmed behind; a tap on the dimmed view drops it back
  to half, and a tap on the view closes it. It is the phone's only trip
  sheet.
- **The top bar is ☰, the app's name, search, + for a new trip and the
  account,** the + taking the place of a round button at the foot, which
  covered trips and which Carbon has no part for. The toolbar under it
  names the month and year, as the iPhone's Calendar does, with Today.
- **Move to bus and Change driver are the Bus and Driver rows of the
  pulled-up sheet,** as rux decided, each opening its picker; a drag still
  moves a trip.
- **A driver's and a customer's names open a screen of their own,** as rux
  decided, in this plan: a driver's trips this week with their status and
  Call, and a customer's coming trips and contacts, each opening the half
  sheet for a trip.
- **The bar at the foot holds Board, Drivers, Tasks and Live map,** built
  from Design's `frame-bar`, rux having no preference: Drivers leads to the
  driver's screen, Tasks carries its due mark as the toolbar does now,
  search is in the top bar, and the ☰ menu keeps every other page.
- **Every task is measured before and after** in Chrome on :8641 on a real
  week, a scroll's and a sheet's frames, with the numbers in the commit
  message, **and checked in the iPhone simulator,** held both ways.

## Questions

None open.

## Tasks

- [ ] Add the bar of places at the foot.
- [ ] Build the driver's screen and the customer's screen.
