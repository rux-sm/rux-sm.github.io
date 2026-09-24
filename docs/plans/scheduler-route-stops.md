---
type: plan
---

# Plan: the stops the Route tab does not ask for

## Goal

The Route tab fills as it does now — six fields and the Times list, a trip
bar's worth of route in under a minute — and carries one closed line beneath
them. Opened, it asks when the group reaches the destination and when it
leaves, and lists whatever further stops the driver itinerary built. A trip
nobody opens it for is one line taller than today.

## Decisions

- **Nothing is added above the Times list and the six fields do not move.**
  The tab earns its place by being fillable at a glance, and a form that
  opens taller than today's has spent that.

- **A round trip shows where the group is dropped off rather than asking.**
  "Drop-off" reads as where the group is let out for the day — the
  destination — and the drive home is measured from whatever is entered
  there, so the natural misreading moves Yard return by hours in silence. The
  two fields render as the pickup with a link that opens them for a trip that
  ends somewhere else.

- **The closed line says what is inside it:** no stops between, a destination
  and its times, or a count of the stops the itinerary holds. A disclosure
  that does not say what it hides is a press nobody makes.

- **Opened, it asks two times and no places: when the group reaches the
  destination and when it leaves.** That is the middle every charter has, the
  destination is already on the trip, and the gap between the two is where
  the day's waiting sits; a route with more than one middle is an itinerary.

- **The two times write two stop rows where the tab writes one today.** The
  first holds the destination and the group's arrival, the second the
  drop-off and the group's return, so `depart_prev` and `arrive` each keep
  one meaning instead of sharing a row. A trip left closed writes what it
  writes today.

- **The whole itinerary can be entered inside the section,** simply: one
  row per stop with its place, its times and its dwell, added, removed and
  reordered there. The quick path stays the six fields and the times, and the
  section is for the day someone goes back to fill the rest. It keeps only
  what a driver's day needs from rux-ui's Itinerary tab, not all of it.

- **Every leg is measured,** including the ones between middle stops, by the
  same Mapbox call that measures the yard's two, so the section's driving
  total covers the whole day.

- **No database change.** `trip_stops` already carries every field the four
  rows need; the tab stops collapsing two of them onto one.

- **The disclosure is Carbon's accordion,** which Design already compiles and
  shows at `design/sink/accordion.html`, so the section is markup and no new
  rule.

- **It opens closed every time, however full.** A count read at a glance is
  the point; a section that springs open on a trip with six stops is the
  intimidating form this plan exists to avoid.

- **The dwell is asked as one control — on duty, off duty or sleeper — and
  the section totals the day's driving and on-duty hours.** The two times say
  how long the bus waits and the control says whether that time is duty, and
  those three answers are what decide whether a driver may legally run the
  trip; `trip_stops.dwell_status` already holds the answer.

- **The totals stay inside the section and so do the two times.** The Times
  list keeps the five it has, because a tab that grows above the fold for
  every trip is the cost this plan refuses.

- **A one-way trip is not asked for a destination.** Its drop-off is its
  destination and Group arrives already records it, so the section holds only
  the stops an itinerary built, if there are any.

## Questions

- Which layout for the stop list inside the section? A page of options is
  built for rux to pick from before the editor is built.

## Tasks

- [ ] Build a page of two or three stop-list layouts with invented stops,
      and rux picks one.
- [ ] Render a round trip's drop-off as the pickup, with a link that opens
      the two fields.
- [ ] Add the closed section under the Times list, named for what it holds.
- [ ] Ask the destination's two times and its dwell inside it, and write the
      two stop rows they describe.
- [ ] Total the leg's driving and on-duty hours inside the section.
- [ ] Build the stop list in the picked layout: add, remove and reorder
      stops, each leg measured with its miles and drive.
- [ ] Check a trip rux-ui built an itinerary for keeps every stop through a
      save from this tab.
- [ ] Check a trip left closed writes the rows it writes today.
