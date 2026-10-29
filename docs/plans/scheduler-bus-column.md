---
type: plan
---

# Plan: the bus column shows each bus's own state

## Goal

The board's bus column says what each bus is and, in the current week, what
it is doing now: its unit number and type, its equipment, a fuel gauge and a
DEF gauge, and the city it is in. What belongs to the vehicle leaves the trip
bar, so a trip bar says only the trip. Every reading is quiet grey while it
is normal and takes colour only when it needs the office, as the board's bars
do.

Today the column is about 32px wide and holds the number, the lift and
sleeper marks while the view option shows them, and an out-of-service mark;
the rest is in the number's toggletip. Samsara's live readings reach only a
bar that is out on the road, through `scheduler/road-bar.js`.

## Decisions

- **The head is 56px wide and the row's full 122px tall,** because each day
  loses about 3px to it, where an 84px head with a speed dial cost 7.
- **Top to bottom:** the unit number; the type; the equipment icons; then, in
  the current week, the fuel gauge and the DEF gauge side by side; and last
  the city, cut short with an ellipsis when it does not fit.
- **Every head shows its type, under a type band too,** so a head reads on
  its own when the band has scrolled away.
- **The unit number never moves,** top left in every row and every week, so
  the eye finds a bus in the same place.
- **The head draws no speed dial,** because most buses are parked most of
  the day and a dial on every row would mostly say 0.
- **Fuel and DEF are 3px vertical gauges, 50px tall, that empty downward,**
  each with a tick at its low mark, so the head shows how near a bus is to
  its limit before it reaches it. Fuel is low at 25% and critical at 10%;
  DEF is low at 15% and critical at 5%, short of the engine's derate.
- **A bus that reports no DEF to Samsara draws no D gauge,** found by reading
  the stat for every bus once while building, since not every bus may have
  the sensor.
- **Normal is white on the theme's grey; low is the warning colour; critical
  is the error colour,** each gauge's empty part taking a dark step of the
  same colour, and a reading is never told by colour alone: its letter,
  its height and the toggletip's words carry it too.
- **The live block shows only while the shown week holds today.** In any
  other week the head keeps the number, type and equipment, and adds seats
  and the inspection expiry, in the warning colour within the Fleet page's
  45 days, because the inspection is the date that keeps a bus off a trip.
- **With no signal the gauges fade to their last reading,** and the city line
  becomes how long ago the bus was last seen.
- **Four marks sit beside the number, and only while they are true:** a lost
  signal, a lit engine lamp, speeding over 75 mph in the warning colour, and
  idling past road-bar.js's 30 minutes. A bus with nothing wrong shows no
  mark, so a mark always means something.
- **The rounded ends are on the gauges alone,** Rux's own touch on these
  instruments, while every Carbon control stays square.
- **Every colour is a theme token,** so the head works in all twelve themes,
  and Rux 100 sets its greys.
- **The live trip bar sheds its speed, fuel and signal strip** and keeps the
  trip's own progress; what it shed is in the head and its toggletip.
- **Clicking the head opens the number's toggletip, as it does now, and it
  gains the speed, the full address, odometer, last seen and the engine's
  fault words,** so the head stays short and the detail is one click away.
- **The compact board and a phone draw the number and one state dot,**
  because their rows have no room for the gauges.
- **samsara-now is asked once a minute while the current week is shown and
  the page is in view,** where today it is asked only while a bar is on the
  road, so every bus's head is live.
- **DEF is read from Samsara's DEF level stat in `samsara-now`,** a function
  change deployed as its own step on rux's yes.

## Questions

None open.

## Tasks

- [ ] Add the DEF stat to `scheduler/samsara-now/handler.ts` and `scheduler/tools/check-samsara-now.mjs`, and deploy it on rux's yes.
- [ ] Ask samsara-now while the current week is shown, in `scheduler/data.js`'s road poll.
- [ ] Widen the bus column to 56px and lay out the head in `scheduler/data.js` and `scheduler/app.css`.
- [ ] Draw the two gauges, with their normal, low, critical and no-signal states.
- [ ] Draw the four marks beside the number: no signal, engine lamp, speeding and idling.
- [ ] Read Samsara's DEF stat once for every bus and note which report none.
- [ ] Draw another week's head: seats and the inspection expiry.
- [ ] Set the head's colours per theme in `scheduler/theme.css`, Rux 100 first.
- [ ] Take the speed, fuel and signal strip off the live trip bar in `scheduler/road-bar.js`.
- [ ] Add the speed, address, odometer, last seen and fault words to the number's toggletip.
- [ ] Draw the compact board's and the phone's head as the number and a state dot.
- [ ] Update `scheduler/docs/screen-inventory.md` for the new column.
- [ ] Check every state in Chrome on :8641 in Rux 100 and two other themes.
