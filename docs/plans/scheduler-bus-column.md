---
type: plan
---

# Plan: the bus column shows each bus's own state

## Goal

The board's bus column says what each bus is and, in the current week, what
it is doing now: its unit number and type, its equipment, a speed dial
between a fuel gauge and a DEF gauge, and the city it is in. What belongs to
the vehicle leaves the trip bar, so a trip bar says only the trip. Every
reading is quiet grey while it is normal and takes colour only when it needs
the office, as the board's bars do.

Today the column is about 32px wide and holds the number, the lift and
sleeper marks while the view option shows them, and an out-of-service mark;
the rest is in the number's toggletip. Samsara's live readings reach only a
bar that is out on the road, through `scheduler/road-bar.js`.

## Decisions

- **The head is 84px wide and the row's full 122px tall,** because a narrow
  column costs each day about 7px where a 104px one cost 10.
- **Top to bottom:** the unit number; the type, with the equipment icons at
  its right; then, in the current week, the fuel gauge, the speed dial and
  the DEF gauge side by side; and last the city.
- **Every head shows its type, under a type band too,** so a head reads on
  its own when the band has scrolled away.
- **The unit number never moves,** top left in every row and every week, so
  the eye finds a bus in the same place.
- **The speed dial is a 270° arc, 2.6px, filling from 0 to 85 mph,** with the
  speed in the middle and mph under it, and a tick at 75 mph, from where the
  arc and the speed take the warning colour.
  Stopped with the engine on it says Idle and for how long; with no signal
  its track is dashed and the speed is a dash.
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
- **A lost signal and a lit engine lamp are marks beside the number,** and
  nothing else is: no signal bars on a bus that has signal.
- **The rounded ends are on the dial and the gauges alone,** Rux's own touch
  on these instruments, while every Carbon control stays square.
- **Every colour is a theme token,** so the head works in all twelve themes,
  and Rux 100 sets its greys.
- **The live trip bar sheds its speed, fuel and signal strip** and keeps the
  trip's own progress; what it shed is in the head.
- **Clicking the head opens the number's toggletip, as it does now, and it
  gains the full address, odometer, last seen and the engine's fault
  words,** so the head stays short and the detail is one click away.
- **The compact board and a phone draw the number and one state dot,**
  because their rows have no room for the dial.
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
- [ ] Widen the bus column to 84px and lay out the head in `scheduler/data.js` and `scheduler/app.css`.
- [ ] Draw the dial and the two gauges, with their normal, low, critical, idle and no-signal states.
- [ ] Read Samsara's DEF stat once for every bus and note which report none.
- [ ] Draw another week's head: seats and the inspection expiry.
- [ ] Set the head's colours per theme in `scheduler/theme.css`, Rux 100 first.
- [ ] Take the speed, fuel and signal strip off the live trip bar in `scheduler/road-bar.js`.
- [ ] Add the address, odometer, last seen and fault words to the number's toggletip.
- [ ] Draw the compact board's and the phone's head as the number and a state dot.
- [ ] Update `scheduler/docs/screen-inventory.md` for the new column.
- [ ] Check every state in Chrome on :8641 in Rux 100 and two other themes.
