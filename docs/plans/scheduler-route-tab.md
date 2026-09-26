---
type: plan
---

# Plan: the Route tab puts the quick part first and the itinerary in one list

## Goal

Most trips are set up with three things: where the group is picked up, when
it leaves and when it is back. The Route tab keeps those three at the top and
quick to fill. The rest of the day, the stops and the bus's own times, reads
as one short list under them that can be filled in later without the tab
growing heavy, and the day's totals sit in one line where they are seen.

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

These are proposals until rux answers the questions below.

- **The top section stays the quick path:** pickup, departs, back. The two
  times share one row, since a time needs half the width, so the section is
  a row shorter.
- **"Group arrives" becomes "Back at pickup"** on a round trip and "Arrives"
  on a one-way trip, because on a round trip it is the time the group is
  back, not when it reaches the destination.
- **Times and Full itinerary become one list, Itinerary, always open.** It is
  the day in order, one line per row: the bus leaving the yard, the bus at
  the pickup, the group leaving, each stop, the group back, the bus back at
  the yard. The worked-out rows are grey; the stops are the rows that can be
  pressed to edit, as today's dialog does. An Add stop row sits after the
  last stop. The destination shows on the tab without opening anything.
- **One line of totals** on the Itinerary heading's line, at its end, in grey:
  miles, driving and on duty, such as "185 mi · 3 h 51 driving · 12 h 13 on
  duty". It replaces the count in the accordion's title and the totals line
  at its foot.
- **What each row explains moves to its tooltip,** such as "35 min · 15 mi
  from the yard", so every row is one line. A warning, such as a leg not
  measured, stays visible.
- **Split trips keep one leg per bar,** with Drop-off leg and Pick-up leg as
  the section names.
- **No database change.** The rows Save writes stay as they are.

## Questions

1. Should the pickup stay two fields, a name and an address, or become one
   address search that fills the name, with the name changeable after?
2. Is "Back at pickup" the right words for a round trip's return time?
3. Where should Estimated miles and Actual miles go: the foot of the Route
   tab as now, or the Billing tab beside the quote they feed?
4. Should the totals sit on the Itinerary heading's line, or in a line of
   their own at the very top of the tab?
5. Should the bus's yard times show as rows in the list, or only in the
   totals line?

## Tasks

- [ ] Mock the new layout on a real trip, a round trip with stops, a one-way
      trip and a split trip, in one Chrome tab per option, and settle the
      questions from what is on screen.
- [ ] Put the two times on one row and rename the return time.
- [ ] Replace Times and the Full itinerary accordion with the Itinerary list,
      stops editable in place and Add stop at its end.
- [ ] Move the totals to one line and the row explanations to tooltips.
- [ ] Move the miles fields to wherever question 3 lands.
- [ ] Rewrite the Route tab's row in `scheduler/docs/screen-inventory.md`,
      which still describes Depart beside End and an overflow menu the tab no
      longer has.
- [ ] Check every trip type in Chrome at full width, the wide editor and a
      402px frame, and that Save writes the same rows as before on an
      untouched trip.
