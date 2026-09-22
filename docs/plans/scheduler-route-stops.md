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

- **Stops beyond the destination are listed and not editable,** with each
  leg's miles and drive. rux-ui's Itinerary tab is the only thing that writes
  them and this app has no editor for them at all, so a list that offered to
  edit would be offering something that is not there.

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

- The two times are the only stops this app can write, and everything past
  the destination is still rux-ui's to enter. Does that stand until the
  Itinerary tab's grid is built, or does this section grow an editor first?
- The tab measures the yard's two legs and nothing between them, so a trip
  whose middle stops carry no drive has no driving total, only a line naming
  how many legs are unmeasured. Should the tab ask Mapbox for the drive from
  the destination to the drop-off as it does for the yard's two, or does that
  drive belong to the driver itinerary?

## Tasks

- [ ] rux answers the questions above.
- [ ] Render a round trip's drop-off as the pickup, with a link that opens
      the two fields.
- [ ] Add the closed section under the Times list, named for what it holds.
- [ ] Ask the destination's two times and its dwell inside it, and write the
      two stop rows they describe.
- [ ] Total the leg's driving and on-duty hours inside the section.
- [ ] List the stops beyond the destination, with each leg's miles and drive.
- [ ] Check a trip rux-ui built an itinerary for keeps every stop through a
      save from this tab.
- [ ] Check a trip left closed writes the rows it writes today.
