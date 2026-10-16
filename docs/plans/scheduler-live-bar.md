---
type: plan
---

# Plan: A live bar that says what is wrong

## Goal

While a bar's bus is out, the four rows under its destination and customer
become one card of what Samsara says: a small dial, three short lines beside
it, and the crew in a row underneath. The card is designed for the narrowest
bar, a one-day trip on a 9rem day, 137px, and gains words as the bar widens.
On a board of live bars, the one with a problem stands out and says the
problem in words. The bar keeps its height, and nothing on it moves but a red
warning's first minute.

## Decisions

- **The card is the rows under the customer.** Contact, time, update and
  drivers give way to it while the bus is out, so the bar keeps its height
  and the minimum day stays 9rem. Its sides come 2px in from the bar's edge,
  so its words line up with the destination.
- **The card is laid out as A2.** Rows one to three: the dial on the left,
  44px, and beside it the next stop in bold, its arrival, and the fuel pump
  with the tank's percent. Row four: each driver in one row.
- **The card fills only the rows the view shows.** Four rows draw the whole
  card. With three, the crew row goes. With two, the dial goes and the lines
  read "Marathon Inn 6:05p" and "61 mph · 41%". With one, only the first line
  is left.
- **The dial's outer ring is speed, its inner ring fuel.** Speed fills
  green to 80 mph, with the number in the middle. Fuel is in the bar's ink,
  amber under a quarter. Idling or off, the middle reads Idle or Off and the
  speed ring is empty. With no signal the dial is grey and dashed, and the
  third line reads "No signal 12m".
- **Green on the card means a moving bus.** The speed ring is the only
  green apart from the duty rings, which are a driver's hours, not motion.
- **A border means a problem.** All well, the card is its shade alone, with
  no outline. A warning gives it a 2px border in the worst warning's red or
  amber, a red one with a light red shade. A board of outlined cards hides
  the one that matters.
- **A warning takes the three lines beside the dial.** Line one is its
  name in its colour, with no icon, so "Not rolling" fits at 137px. Lines
  two and three are its few words, split in two. The crew row stays.
- **Late is said beside the arrival.** When road.js finds the bus more
  than 10 minutes late to its next stop, the arrival reads "6:05p +22m",
  with the minutes in amber. At a stop, line one reads "At Lakeview High"
  and line two how long it has been there.
- **The departure and return leave the bar while it is live.** They stay
  on the card's tooltip with the next stop, and the clock line goes.
- **The crew row is a ring and a name for each driver.** The ring is the
  driving hours left of ten, amber under one. The driver at the wheel is
  bold. Below an 11rem day, a second driver leaves room for names only.
  From 11rem, or with one driver, hours under one are written after the
  name in amber.
- **Wrong bus marks its driver.** The `wrongBus` warning carries `driver`,
  the id, and `bus`, the other bus's number. That driver's ring becomes the
  red error mark, with the name in red and "in 119" after it.
- **A stop lamp is a red warning.** `live-trip.js` gains `stopLamp`, first
  in the list: title "Stop lamp", its first code as the few words, every code
  in the sentence. A check-engine lamp stays an amber icon at the
  destination row's end, because those can stay lit for days.
- **The tank is a fuel pump and its percent.** Material's
  `local_gas_station` goes on Design's sheet as a `gas-station` row.
- **The engine lamp is Design's first drawing of its own.** Neither Carbon
  nor Material draws an engine. So `engine.svg` is drawn in
  `design/assets/icons-rux/`, on a 32 grid as a solid silhouette, and named in
  the `car--front` row's rux column, the row for an engine reporting a fault.
- **Idling is quiet until it runs long.** Idle is in the bar's ink until a
  limit, then amber. The limit is a constant in `road-bar.js`, 30 minutes
  until rux says otherwise.
- **The legend draws the card's shade as an image layer.** Two colours
  listed as background layers are invalid and draw nothing.

## Questions

- Is 30 minutes the right point for idling to turn amber?
- The engine puts an `r-` icon on a page that otherwise draws Material, which
  the icon sheet says an app does not do. Is that fine for an idea no family
  draws, or should the bar keep Material's car under a wrench?
- An earlier live panel was drawn but never committed, and this checkout
  does not have it. The card replaces it. Can that work be dropped?

## Tasks

- [ ] `live-trip.js`: the `stopLamp` warning first in the list, and `driver`
  and `bus` on `wrongBus`, with its header saying both.
- [ ] Design: the `gas-station` row and the `engine` drawing on the sheet,
  `npm run icons` in `design/`, then `node tools/inline-sprite.mjs` alone.
- [ ] `road-bar.js`: the card in place of the contact, time, update and
  drivers rows; the dial, the three lines, the warning lines and the crew
  row; how many rows the view shows; the idle limit; the wrong-bus mark.
- [ ] `app.css`: the card, its shade and border, the dial, the crew row,
  and the legend swatch, every colour a `--rux-*` token or the bar's own.
- [ ] `components-data.js` samples: all well, late with two drivers, at a
  stop, idling past the limit, no signal, each warning, and the card with
  three, two and one rows shown.
- [ ] `check-bar.mjs` cases: the rows the card fills, the late arrival, the
  warning lines, the stop lamp, the wrong-bus mark, the crew row's hours by
  width, and the idle limit.
- [ ] The live line's row in `scheduler/docs/screen-inventory.md`, the
  headers of `road-bar.js` and `live-trip.js`, and the legend in
  `index.html` say what the bar now does.
- [ ] Check it in Chrome on :8641. The components page in a dark and a light
  theme, with bars at 137px, on the compact board and with each row toggle
  off. The light themes' amber needs to read on the card's shade.
