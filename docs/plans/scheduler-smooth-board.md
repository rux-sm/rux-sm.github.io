---
type: plan
---

# Plan: A board that stays smooth as its width changes

## Goal

A change of the board's width, from resizing the window or opening or
closing a panel beside the week, costs the browser a layout and not a
restyle of every element, so the board keeps up frame by frame, a panel can
push the week as Carbon's side panel pushes the page, and the code that sizes
the week has no holds or caches to keep right.

Today each change costs 90–125ms, so the board draws eight to ten frames a
second while it changes. The width alone costs 1–2ms. The rest is `fit` in
`scheduler/app.js` writing the day and bus-column widths as custom
properties on `#scheduler-week`, which every one of its 6,300 elements
inherits and restyles for: 37–43ms a write there, 4ms on one track.

## Decisions

- **Nothing inherited is written when the width changes.** `fit` writes
  the day columns as the grid's own `grid-template-columns`, and trips, the
  yard and out-of-service stripes take a day as `100% / var(--scheduler-days)`
  of their track, which `app.css` already declares; measured in Chrome on
  :8641, a change of day width then cost 2ms against 37ms, the track stayed
  35 days of 175px, and a trip on day four stayed at 704px.
- **Edges stay on whole pixels by CSS `round()`,** worked out at layout
  time, because a percentage put 946 edges on fractions of a pixel, which
  blurs them; `round(down, …, 1px)` gave whole pixels in Chrome 156, and
  Safari is checked on the iPhone simulator before it ships.
- **`data.js` takes a day's width from `app.js`,** which hands over the
  number it wrote through `window.Rux.schedule`, because `dayWidth()` reads
  the `--scheduler-day-w` this removes.
- **What patched the cost goes.** The `data-days-held` hold while a
  document is dragged wider is deleted once a fit measures cheap; nothing
  skips trips off screen, which would hide them from Find and screen
  readers; no measure is kept from an earlier fit to be trusted later.
- **Every task is measured before and after** in Chrome on :8641 on a real
  week: a full `fit`, and the frames of a 240ms change of the week's width.
  The numbers go in the commit message.
- **Panel motion comes last,** once a full `fit` fits in a frame, on
  Carbon's curves and durations in `design/docs/motion.md`.

## Questions

- The bus column takes the few pixels the days cannot share, so its width
  changes with every pixel of the window, and each trip's sticky name reads
  it. Should the column keep its width until its buses change, leaving 0–6px
  empty at the week's right edge? If not, each change still restyles the
  whole week.
- Once `fit` is cheap, should a panel push the week as Carbon's does, the
  week narrowing while the panel slides in, or use Reveal, the week
  narrowing at once and the panel sliding into the space?

## Tasks

- [ ] Write the day columns on the grid, place trips, the yard and stripes
      by percentage of their track on whole pixels, and hand `data.js` the
      day's width.
- [ ] Check the board in Safari on the iPhone simulator: whole-pixel edges,
      trips in place, the week's swipe and the strip's glide.
- [ ] Keep the bus column's width until its buses change, on rux's yes.
- [ ] Delete the `data-days-held` hold, with a document dragged wider
      measured smooth without it.
- [ ] Measure the trip editor's opening and cut what is left of its pause.
- [ ] Add the panel motion, and correct `design/docs/motion.md`, which files
      a panel arriving under expressive motion where Carbon's side panel is
      productive.
