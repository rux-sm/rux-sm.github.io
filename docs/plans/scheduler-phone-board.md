---
type: plan
---

# Plan: The scheduler's board on a phone

## Goal

On a phone the board says what is going on today and in the days after at a
glance, and a trip, its itinerary, its driver or its customer is a tap or
two away. It stops being the Mac's board narrowed: it is three views under
one switch, List, 3 days and Week, and a tapped trip opens a half sheet
over the view rather than a sheet that takes the screen.

Today the phone shows the strip two days wide, a flick a day, its trips
three lines beside a narrow bus column, a tap on a trip opening its sheet
and a tap on a bus the bus's, and above it the month, Today and search
over the week; the editor opens over the board as the Mac's form.

The mockups rux chose from are `design/m/phone-agenda.html`,
`design/m/phone-peek.html` and `design/m/phone-week.html`, local and
unpublished, served on :8641.

## Decisions

- **Three views under one switch, List, 3 days and Week,** as rux decided,
  the switch Carbon's content switcher under the date line.
- **List is today, then each day after it, in one scroll,** as rux decided.
  Today's trips are full cards grouped On the road, Later today and Done,
  a trip on the road saying on time or how late; a later day's trips are
  the same cards in two lines. A day's name sticks at the top while its
  trips pass under it, with how many need attention, and a day with none
  says every bus is free.
- **The week row follows the scroll and jumps,** as rux decided: under
  each day the number of its trips and a dot where one needs attention,
  the day in view marked, a tap going to that day and Today back.
- **3 days is a bus a row, three days across,** as rux decided: a trip over
  several days one bar across them, an empty row a free bus, the trips with
  no bus in a row of their own at the foot, ‹ › a day at a time. It takes
  the two-day strip's place, and a tap on a bus still opens the bus's
  sheet.
- **Week is a day a row,** as rux decided: each day's trips as tiles giving
  where, when or which day of a longer trip, the bus and the driver with
  their status, and each day's count and how many need attention.
- **A tapped trip opens a half sheet,** as rux decided, over the bottom
  half with the view still showing above it and the trip marked in it:
  where, the customer and times, what is happening now, the bus and the
  driver, and three large buttons, Itinerary, Call or text, and Route. A
  tap on another trip moves the sheet to it. Its handle pulls it to the
  top for the customer, the contacts, the pickup, the newest update and
  Edit trip, the view dimmed behind; a tap on the dimmed view drops it back
  to half, and a tap on the view closes it. It takes the place of today's
  docked sheet and its row of five buttons.
- **The top bar is ☰, the app's name, search, + for a new trip and the
  account,** the + taking the place of a round button at the foot, which
  covered trips and which Carbon has no part for. The date line under it
  names the day or the days in view, with ‹ › in 3 days and Today.
- **The phone opens on List the first time and on the view last used after
  that,** as rux decided, kept in that phone's browser.
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

- [ ] Put the view switch and the date line over the board, and the + and
  search in the top bar.
- [ ] Build List: today grouped, the days after it, the sticky day names
  and the week row that follows the scroll.
- [ ] Replace the docked sheet with the half sheet and its pulled-up rest.
- [ ] Rebuild the two-day strip as 3 days, a bus a row, with ‹ ›.
- [ ] Build Week, a day a row.
- [ ] Add the bar of places at the foot.
- [ ] Make Move to bus and Change driver the pulled-up sheet's rows.
- [ ] Build the driver's screen and the customer's screen.
- [ ] Show more days in 3 days with the phone turned sideways.
