---
type: plan
---

# Plan: A live bar that says what is wrong

## Goal

A trip bar whose bus is out draws one panel of what Samsara says, under its
destination and customer. On a board of live bars, the one with a problem
stands out and says the problem in words. Every mark means one thing, every
icon reads as what it is, and the view menu's row toggles hide what they name.
The bar keeps its height, and nothing on it moves but a red warning's first
minute.

## Decisions

- **A border means a problem.** All well, the panel is its shade alone, with
  no outline. A border is the bus's state: 2px of the worst warning's red or
  amber, purple at rest, grey and dashed with no signal. A board of outlined
  panels hides the one that matters.
- **Room over the panel comes from the bar's own padding.** The bar has 8px
  to spare, 4px at the top and 4px at the bottom, and its height stays. A live
  bar moves its destination and customer up 2px into the top padding and puts
  those 2px over the status. The panel's top edge then sits 1px below the
  customer's row instead of cutting through its descenders. The panel's
  sides come 2px in from the bar's edge, so the words sit 6px inside it and
  still line up with the destination.
- **The legend draws the panel's shade as an image layer.** The swatch now
  lists two colours as background layers, which is invalid, so it draws no
  background at all. The all-well swatch loses its outline too.
- **Late is said in words as well as amber.** When road.js finds the bus
  more than 10 minutes late to its next stop, the status adds "· 1h 4m late"
  in amber after the arrival. When that stop is the yard, the clock's return
  turns amber with the overrun, "4:50p +1:04". The pickup keeps its own Late
  to spot warning.
- **A stop lamp is a red warning.** `live-trip.js` gains `stopLamp`, first
  in the list: title "Stop lamp", its first code as the few words, every code
  in the sentence. The panel, the status, the first-minute blink, the card's
  warning bands and the Live map follow from the list. A check-engine lamp
  stays an amber icon, because those can stay lit for days.
- **The tank on the bar is a fuel pump and its percent.** Material's
  `local_gas_station` goes on Design's sheet as a `gas-station` row. The live
  card keeps its gauge, because the word Fuel already labels it.
- **The engine lamp is Design's first drawing of its own.** Neither Carbon
  nor Material draws an engine. So `engine.svg` is drawn in
  `design/assets/icons-rux/`, on a 32 grid as a solid silhouette, and named in
  the `car--front` row's rux column, the row for an engine reporting a fault.
- **Green on the panel means a moving bus.** The status leads with the
  heading arrow instead of a dot: green while the bus moves, the bar's ink
  while it stands, grey with no signal. It leads with a pin at a stop or with
  no heading. The readings lose the arrow. A crew's confirmed dot stays the
  only other green.
- **Wrong bus marks its driver.** The `wrongBus` warning carries `driver`,
  the id, and `bus`, the other bus's number. In the crew, that driver's dot
  becomes the red error mark, with the name in red and "in 119" after it.
- **Drivers off hides the drivers.** With the week's
  `scheduler-week--no-drivers`, the panel drops the crew first, then the
  clock, then the readings. The readings then name the driver at the wheel,
  from an element app.css shows only while the crew is hidden.
- **The clock line reads on navy.** The filled part is the full ink and 3px
  tall, over a 3px track at 22%.
- **Idling is quiet until it runs long.** Idle is in the bar's ink until a
  limit, then amber. The limit is a constant in `road-bar.js`, 30 minutes
  until rux says otherwise.

## Questions

- Is 30 minutes the right point for idling to turn amber?
- Late in words on the status line, plus the overrun on the clock: keep
  both, or the words alone?
- At a stop, should the status lead with a pin, or with no mark at all?
- The engine puts an `r-` icon on a page that otherwise draws Material, which
  the icon sheet says an app does not do. Is that fine for an idea no family
  draws, or should the bar keep Material's car under a wrench?
- The panel these build on is not committed yet. Should it be committed on
  its own first, or together with this?

## Tasks

- [ ] Panel in `app.css`: no outline while all is well, the 2px over the
  status, sides 2px in, and the legend swatch's shade as an image layer.
- [ ] `live-trip.js`: the `stopLamp` warning first in the list, and `driver`
  and `bus` on `wrongBus`, with its header saying both.
- [ ] Design: the `gas-station` row and the `engine` drawing on the sheet,
  `npm run icons` in `design/`, then `node tools/inline-sprite.mjs` alone.
- [ ] `road-bar.js`: the heading arrow or pin leading the status, the late
  words, the clock's overrun, the pump, the engine icon, the idle limit, the
  wheel driver for Drivers off, and the wrong-bus driver's mark.
- [ ] `app.css`: the rows for Drivers off, the clock line, the lead, the late
  words, the pump and the crew's wrong-bus mark.
- [ ] `components-data.js` samples: late to the yard, the stop lamp's red
  panel, idling past the limit, and each note in the new words.
- [ ] `check-bar.mjs` cases for each: the lead, the late words and overrun,
  the stop lamp, the wrong-bus mark, the wheel driver with Drivers off, the
  idle limit and the pump.
- [ ] The live line's row in `scheduler/docs/screen-inventory.md`, the
  headers of `road-bar.js` and `live-trip.js`, and the legend in
  `index.html` say what the bar now does.
- [ ] Check it in Chrome on :8641. The components page in a dark and a light
  theme, with bars squeezed to 150px, on the compact board and with Drivers
  off. Raise the light themes' `--scheduler-road-panel` if the shade alone
  does not read there.
