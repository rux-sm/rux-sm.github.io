---
type: plan
---

# Plan: a Live map that says what is wrong at a glance

## Goal

One look at `scheduler/live.html` answers "is anything wrong right now?":
every bus is on the map, a bus with a problem stands out in the board's own
words, and each bus says when it really gets to its next stop. It shows
only what the board already works out, so the two never disagree.

## Decisions

- **The map opens showing every bus,** those out on a trip and those not,
  fitted to all of them, because a quick look must miss nobody;
  `live.html?bus=` still opens on that one bus.
- **The map stays where it is put.** Each minute's answer moves the pins
  and never the view; a Show all button fits every bus again.
- **A bus out on a trip leaves a faint tail of its last hour,** taken from
  the path `samsara-now` already returns for it, so its direction and pace
  show without lines piling up; a whole trip's path stays for the bus that
  is pressed, as now, since five buses on one highway would draw five lines
  on top of each other.
- **A bus not on a trip is a small grey pin with its number,** at its last
  position however old, which `samsara-now` already returns, and its
  panel group is called Not on a trip, since a parked bus is not always at
  the yard.
- **Buses too close to tell apart are one pin listing their numbers,**
  coloured by the worst warning among them; zooming in splits it, and
  pressing it lists them. It is worked out on the page, with no clustering
  library to load.
- **The panel opens with one line,** "6 out · 1 needs attention · 3 not on
  a trip", and the time of the last answer, because those are the three
  things a glance needs.
- **A bus's warnings are live-trip.js's,** the same words, order and red or
  amber as its bar on the board, on its tile and as its pin's colour, and
  buses with a warning sort to the top of On the road.
- **The input those warnings need is built from the trip's own rows by one
  shared function,** which the board then uses too, because the board builds
  it now from the bar on the page (`roadLook` in `scheduler/data.js`), which
  the map does not have.
- **A tile says both times,** "Due 6:00p · arrives 6:25p", the arrival
  being road.js's own estimate; which stops can be late stays road.js's
  rule.
- **A reading older than `samsara-now`'s FRESH_MS is faded,** pin and tile,
  with "Last seen 1:20p", so an old position is never read as now.
- **Pressing a bus opens the board's live card beside the map,** the same
  card, drawn from where both pages can reach it, with Call driver, Open
  trip and Copy tracking link, so the map is somewhere to act from.
- **Geofences, replay, address searches and cameras stay in Samsara,**
  because Samsara already does them well, behind an Open in Samsara link
  on the card.

## Questions

- Should a bus arriving late at a stop that is not a pickup, such as a
  hotel, show amber too? road.js now warns only for pickups, because every
  other stop moves with the day.
- Is one hour the right length for the tail?

## Tasks

- [ ] Move the building of a bus's warning input out of `roadLook` into a
  shared function that reads the trip's rows, the board calling it, with
  `scheduler/tools/check-bar.mjs`'s cases still passing.
- [ ] Show each bus's warnings on its tile and pin, sort them first, and add
  the summary line and last-answer time.
- [ ] Show due and arrival times on every tile, and fade old readings.
- [ ] Put every bus on the map, the grey pins for buses not on a trip, and
  fit the opening view to all of them, with Show all.
- [ ] Draw the last hour's tail for every bus out.
- [ ] Join pins too close to tell apart, splitting as the map zooms in.
- [ ] Make the board's live card drawable on the map, with Call driver, Open
  trip, Copy tracking link and Open in Samsara.
- [ ] Update the comment at the head of `scheduler/live.js` and the Live
  map line in `scheduler/README.md` with each change.
