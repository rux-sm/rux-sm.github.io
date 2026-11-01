---
type: plan
---

# Plan: One tip for a leg's route

## Goal

Pressing a trip bar's time line shows the whole leg in one tip: the yard
out, the pickup, every stop and the yard back, each with its planned time
beside what really happened. Every point can be read, however many stops
crowd a narrow bar, on a phone as on the Mac.

## Decisions

- **One tip for the route, not one per tick,** because the yard out and the
  pickup are usually under half an hour apart, a pixel or two on a day-long
  line, and no widening separates them.
- **It opens from anywhere on the line:** a tick, the line between ticks, or
  either of the two times, which become buttons Tab reaches. The row of the
  point nearest the press is lit. It is the same on a bar at rest and a bus
  out on the road.
- **Its rows are the leg in order:** Yard out, Pickup · its place, each stop,
  Yard back. Two columns, Planned and Actual, under the head "Route".
- **Planned is the route's own time:** the leg's yard-out and yard-back, the
  pickup's spot, and each stop's arrive time. The word "Arrives" goes, since
  it read as a forecast.
- **Actual is what Samsara recorded:** `actual_yard_depart_at`, `pickup_at`
  and `actual_yard_return_at` on the bus's `trip_assignments` row, and each
  stop's arrival once it is recorded. A point with none shows a dash.
- **While the bus is out, Actual says where it is:** a stop reached but not
  yet recorded says Reached, the stop it is at says Here now, and the next
  stop shows the live estimate faded, as ~2:05a.
- **Only the pickup is judged,** On time in green or the minutes late in
  amber, because it is the one stop a bus can be late to and the one that
  pays the driver's $20; every other row shows its times alone.
- **The ticks stay as they are,** placed by the clock and merged when close,
  because they are now a picture of the route and the tip is where each
  point is read.
- **It is built after `scheduler-tips.md` lands,** since both change the
  tips in `scheduler/data.js` and share their `scheduler-tip` rows.
- **A stop's arrival is read like the pickup's,** by
  `scheduler/samsara-miles/handler.ts` across the leg's window by the reach
  `scheduler/road.js` keeps, and kept on the bus's row as
  `trip_assignments.stop_arrivals`, each stop's id to its time. Get from
  Samsara saves it with the pickup, and the nightly run in
  `scheduler-yard-times.md` with the yard times.
- **The database change is its own step,** SQL shown to rux and applied on
  rux's yes before the code that reads it is pushed.

## Questions

- **Record a real arrival at every stop?** Today only the yard out, the
  pickup and the yard back are recorded. The rest needs the new column and
  the Samsara change above. Recommended: yes, or the middle stops' Actual
  stays a dash once the bus is back.

## Tasks

- [ ] Draw the route tip in `scheduler/data.js` in place of the stop tip,
  opened from the line and the two times in `scheduler/bar.js` and
  `scheduler/road-bar.js`, with the tests in
  `scheduler/tools/check-bar.mjs` and a sample on the components page.
- [ ] Show rux the SQL for `trip_assignments.stop_arrivals` and apply it on
  a yes.
- [ ] Teach `samsara-miles` each stop's arrival, with cases in
  `scheduler/tools/check-samsara-miles.mjs`, and deploy it.
- [ ] Save `stop_arrivals` from Get from Samsara beside `pickup_at`, and fill
  the Actual column from it.
- [ ] Describe the tip in `scheduler/docs/screen-inventory.md` and the column
  in `scheduler/docs/database-inventory.md`.
