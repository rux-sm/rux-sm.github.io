---
type: plan
---

# Plan: The day band holds still while the rows bounce

## Goal

Pulling the board down at its top, or up at its foot, bounces the bus rows
and leaves the day band where it is. The driver list does the same under its
own band. Scrolling sideways still carries the days with the trips, to the
pixel.

## Decisions

- **The band stands above the scrolling area, not inside it,** because a
  browser's bounce moves everything a scrolling area holds, a stuck header
  included.
- **The band is a new element before `#scheduler-week` in
  `.scheduler-frame`,** holding the corner and the days, so
  `#scheduler-week` stays the one thing that scrolls and none of data.js's
  scrolling changes.
- **The days follow sideways scrolling by a CSS scroll timeline** named on
  `#scheduler-week` and scoped on the frame, so the browser moves them with
  the trips and no script runs on the scroll; in Chrome the days stand
  within 0.004px of their columns from one end of the strip to the other.
- **A browser with no scroll timeline moves the days from a scroll
  listener,** where they may trail the trips by a frame.
- **The corner stays in the band and the bus tiles stay in the rows,** so a
  bus bounces with its trips.
- **At the strip's two far ends a sideways bounce moves the rows and not the
  days,** since a timeline ends where the scrolling does.
- **The driver list's band moves out the same way,** and needs no timeline,
  since the list never scrolls sideways.
- **Maintenance keeps its band,** because its board scrolls with the page
  and the page's bounce is the browser's own.
- **The first row keeps its 8px under the band** as the scrolling area's own
  padding, in place of the band's margin.

## Questions

None open.

## Tasks

- [ ] In `scheduler/index.html`'s skeleton and data.js's `render`, build the
  corner and the days into a band element before `#scheduler-week`, and the
  roster's days into one before the roster's scrolling area.
- [ ] In `scheduler/app.css`, give the band the week's column sizes, drive
  its days by the week's scroll timeline, and take out what held the band
  inside the scrolling area: its sticking, the 2rem scroll padding and the
  run-on at the corner's edge. Carry each theme's band rules in
  `scheduler/theme.css` to the new element.
- [ ] Add the scroll listener for a browser with no scroll timeline.
- [ ] Point what measures the band at it: app.js's `fit`, and data.js's day
  width, drag ceiling and tip placement.
- [ ] Bring `components.html`, `scheduler/tools/check-strip.mjs` and
  `scheduler/tools/check-drawn.mjs` to the new structure.
- [ ] Prove it: in Chrome, the days on their columns at both ends of the
  strip and after a panel opens; in the iOS simulator, a pull down at the
  top moving the rows and not the band, on the board and the driver list.
- [ ] Say where the band stands in `scheduler/docs/board-layout.md` and
  `scheduler/docs/screen-inventory.md`.
