---
type: plan
---

# Plan: the schedule loses its edge where the page loses its margin

## Goal

In geist the schedule carries four sides and its corners wherever the page has
a margin around it, at every width and whatever else is open. It drops them at
one width and one only: Carbon's md, where `.rux--content` gives up its padding
and the board runs to the screen's own edges.

## Decisions

### The edge belongs to the page's margin, not to the week's width

A side line and a rounded corner want a page behind them. Above md there are
32px of it and the schedule is a card; below md there are none, the board meets
the screen, and the shell header above and the grid's last rule below already
draw the lines the edge would.

So `@media (max-width: 41.98rem)` is where the edge, the corners and the
last-rule trade all happen, in the same query that takes the padding.

### The crowded rule comes out

`theme.css` takes the sides and corners off while the week scrolls and nothing
sits beside it, which starts at about 986px and holds all the way down. That
puts the change 314px above the md breakpoint, so a schedule with a 32px margin
on either side of it sits there with no sides — the one place the edge is
certainly right.

`data-week` has one reader and the `crowded` value behind it has none, so the
attribute, the value `fit` keeps and the `crowded` entry on `Rux.schedule` come
out with it. `fitColumns` keeps its own internal answer, which is what decides
whether the day columns take the remainder.

### `data-board="compact"` is not the hook either

Compact asks whether the board can draw three readable days, and answers at
26rem of board — 256px below the width the padding goes. It is about how the
week draws, not about what the board sits on, so it keeps the day columns, the
block size, the day band and the docked sheet, and gives the edge up.

### The radius token stays inheritable

The frame hands `--scheduler-surface-radius` down, which is how the toolbar and
the week take the same corners and how the docked sheet squares itself. The md
query sets it to 0, so everything inside the board squares together.

## Questions

- **Should the selected trip's shortcut bar keep its corners below md?** It
  floats over the board rather than filling it, so it has a page behind it
  either way, but it sits inside the frame and inherits the square. Docked, on
  the compact board, it must stay square. Between md and compact it is still
  floating, and only looking says which reads right.

## Tasks

- [ ] Take the crowded rule out of `scheduler/theme.css`, and the `data-week`
      write, the `crowded` value and its `Rux.schedule` entry out of
      `scheduler/app.js`.
- [ ] Move the edge, the corners and the last-rule trade from the compact rule
      in `scheduler/app.css` into the same media query that drops the page
      padding, leaving compact its own decisions.
- [ ] Read the schedule in geist at 1440, 1000, 900, 700, 680, 660 and 402,
      alone and with the roster, the trip editor and the document viewer, and
      confirm the box changes at 672 and nowhere else.
- [ ] Select a trip at 1000, 900 and 600 and confirm the shortcut bar reads
      right at each, then check the phone still squares the docked sheet and
      the board together.
- [ ] Read the same widths in ant-dark, g100, g10 and spotify-dark, which draw
      no edge and must stay unchanged.
