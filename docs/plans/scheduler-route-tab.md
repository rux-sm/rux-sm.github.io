---
type: plan
---

# Plan: the Route tab puts the quick part first and the itinerary in one list

## Goal

Most trips are set up with three things: where the group is picked up, when
it leaves and when it is back. The Route tab keeps those three at the top and
quick to fill. The stops between them are one short list that can be filled
in later without the tab growing heavy, and the bus's times and the day's
totals are a short summary. Nothing else is drawn.

## What the tab is now

Read from the code and from six trips on the board, all round trips:

- **Pickup:** Pickup location, Pickup address, a line saying the group is let
  off where it was picked up with Set a different drop-off, then Group
  departs and Group arrives, one field per row.
- **Times:** five rows of two lines each, Yard depart, Bus arrives, Group
  departs, Group arrives and Yard return, each with what it was worked out
  from. Two of the five repeat the fields just above.
- **Full itinerary:** a closed accordion titled with its count and miles,
  such as "Full itinerary · 1 stop · 185 mi". Every trip read has one stop,
  which is the destination itself, so the trip's main place is hidden behind
  a click. The driving and on-duty totals are at the foot of it, hidden too.
- **Miles:** Estimated miles and Actual miles. Estimated miles overrides the
  route's own sum in the quote calculator.

## Decisions

- **The pickup is one field, Pickup,** an address search. A pick fills the
  place's name and address together; the field shows the name, and the
  address is a grey line under it. A saved location's name is changed on the
  Locations page, not here.
- **A saved location is marked the way a saved contact is:** a location icon
  at the field's end that opens it on the Locations page in a new tab, and
  none for a place from the map search.
- **The search's list tells the two apart.** Saved locations come first, as
  now, each with the same location icon; the map's suggestions follow
  without it.
- **Every address search on the tab works the same way:** the drop-off and a
  stop's address in its dialog take the same field, icon and list.
- **The top section stays the quick path:** pickup, departs, back. The two
  times share one row, since a time needs half the width, so the section is
  a row shorter.
- **"Group arrives" becomes "Back at pickup"** on a round trip and "Arrives"
  on a one-way trip, because on a round trip it is the time the group is
  back, not when it reaches the destination.
- **The tab shows only what is needed.** Nothing is drawn that the fields
  above it already say, and nothing explains itself in a second line.
- **Times and Full itinerary become one list, Stops, always open.** It holds
  only the stops between the pickup and the return, one line each: the time,
  then the place. The pickup and return are the fields above, so they are not
  repeated. A stop is pressed to edit it in today's dialog, and Add stop sits
  at the list's end. The destination shows without opening anything.
- **The bus's times live only in the summary:** leaving the yard, at the
  pickup, and back at the yard. They are worked out, never typed, so they
  get no rows of their own.
- **The two times are Departs and Returns,** and Departs and Arrives on a
  one-way trip, side by side on one row.
- **The summary sits on the Stops heading's line,** at its end, in grey:
  miles, driving and on duty for the whole trip. The bus's three times are
  its tooltip. A leg that could not be measured says so in it.
- **A trip of more than one day groups its stops by day.** Each day is a
  small heading, such as "Day 2 · Tue, Sep 22", with that day's miles,
  driving and on duty at its end, and the Stops heading keeps the trip's
  total. A day's on duty runs from its first time to its last, less the
  waits marked off duty or sleeper. A one-day trip has no day headings.
- **What a figure was worked out from is a tooltip,** such as "35 min · 15 mi
  from the yard", never a line on the page.
- **Estimated miles and Actual miles move to the Billing tab,** beside the
  quote that Estimated miles feeds.
- **Split trips keep one leg per bar,** with Drop-off leg and Pick-up leg as
  the section names.
- **No database change.** The rows Save writes stay as they are.

## Questions

None open.

## Tasks

- [ ] Mock the new layout on a real trip, a round trip with stops, a one-way
      trip and a split trip, in one Chrome tab per option, and settle the
      questions from what is on screen.
- [ ] Make the pickup, drop-off and stop addresses one field each, with the
      saved-location icon on the field and in the search's list.
- [ ] Put Departs and Returns on one row.
- [ ] Replace Times and the Full itinerary accordion with the Stops list,
      stops editable in place and Add stop at its end.
- [ ] Draw the summary on the Stops heading, the day headings and their
      totals on a trip of more than one day, and the explanations as tooltips.
- [ ] Move Estimated miles and Actual miles to the Billing tab.
- [ ] Rewrite the Route tab's row in `scheduler/docs/screen-inventory.md`,
      which still describes Depart beside End and an overflow menu the tab no
      longer has.
- [ ] Check every trip type in Chrome at full width, the wide editor and a
      402px frame, and that Save writes the same rows as before on an
      untouched trip.
