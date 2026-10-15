---
type: plan
---

# Plan: Next stop on the bar, and a live map

## Goal

While a bus is out, the office sees whether it is on time from the board alone,
and where every bus is from one map in the scheduler, without opening Samsara.
Samsara says where a bus is; only the scheduler knows where it should be and
when, so the bar says the next stop and whether the bus will make it.

What the bar shows now is described in `scheduler/data.js` under "On the road,
from Samsara", and `scheduler/samsara-now/handler.ts` is what Samsara is asked.

## Decisions

### The bar

- **The live line says the speed and the next stop with its time:** the
  engine's dot, `52 mph` or `Idle` or `Off`, an arrow, the stop's name cut to
  fit, and the time the bus should get there. The time is green while the bus
  will make it and amber with the minutes over, `3:55p +20`, when it will be
  late.
- **The driving hours move onto the driver's name,** `Rigo 9:21`, amber under
  an hour, as now. The ten blocks go, because the line needs their room.
- **The next stop is the leg's first stop whose time has not passed,** its
  Spot time where it has one and else its Arrives. A bus within a quarter mile
  of a stop is at it, and the line says the stop's name with no time.
- **The time is the bus's arrival worked out from where it is:** Geoapify's
  drive from the bus to the stop, slowed by the route times' percent, as the
  Route tab slows a drive. A late arrival is one more than 10 minutes after the
  stop's time.
- **A stop with no map point, or no time, is passed over** for the next one
  that has both. About one stop in six is typed with no map point today.
- **With no next stop, the line keeps today's words:** the speed and the place
  Samsara gives.
- **The trip's card lists the leg's stops still to come under On the road,**
  each with its time and its worked-out arrival, so the whole day reads at a
  glance.

### The map

- **Live map is its own page in the scheduler,** `scheduler/live.html`, in the
  side nav after Schedule. It is a Leaflet map over Geoapify's street map, as
  the Locations page draws one, with a list of the buses beside it.
- **Each bus is a tag in its trip's colour,** its number and an arrow turned
  the way it is heading, at the point Samsara gives. The list says each bus's
  destination, driver, speed and next stop with its time, the same words as
  its bar.
- **Pressing a bus, on the map or the list, shows its leg:** the stops as
  dots, filled once passed, and a dashed line on from the bus to its next
  stop.
- **A bar's menu has Show on map,** which opens the page on that bus.
- **The page asks Samsara once a minute,** like the board, and only while it
  is in view.

### Samsara and Geoapify

- **`samsara-now` also returns each bus's latitude, longitude and heading,**
  which Samsara already sends with the speed and are dropped today.
- **An arrival is asked of Geoapify at most once every five minutes for each
  bus,** and only while it moves, so a day of trips stays well inside the free
  plan's daily allowance. The arrival in between counts down from the last one.

## Questions

- Should the map show every bus Samsara has, the ones at the yard grey, or
  only the buses out on a trip?
- Is 10 minutes the right point for a stop to turn amber as late?

## Tasks

- [ ] Return latitude, longitude and heading from `samsara-now`, cover them in
      `check-samsara-now.mjs`, and deploy it.
- [ ] Work out each out bar's next stop and arrival in `data.js`, with a
      `tools/check-` test over invented legs: a stop passed, a stop reached,
      a stop with no point, and a leg past its last stop.
- [ ] Draw the next stop on the bar's live line and the hours on the driver's
      name, and list the stops to come on the card.
- [ ] Make the late amber readable on the light themes, where the Idle word
      is hard to read on white today.
- [ ] Build `scheduler/live.html` with its side nav entry, and Show on map in
      the bar's menu.
- [ ] Check the bar and the map in Chrome on :8641 during a real trip, in a
      dark theme and a light one, and at phone width.
- [ ] Describe the live map in `scheduler/docs/screen-inventory.md`.
