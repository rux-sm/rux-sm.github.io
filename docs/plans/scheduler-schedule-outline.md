---
type: plan
---

# Plan: the schedule's box is the same box at every desktop width

## Goal

In geist the schedule carries four sides and its corners at every width a
desktop has, whether the week fits or scrolls and whatever else is open. No
width takes the outline away. The phone's compact board still drops the edge
whole, for its own reason.

## Decisions

### The exception comes out, rather than moving

`theme.css` takes the schedule's sides and corners off while the week scrolls
and nothing sits beside it. That is the state a desktop is in below about
920px, so the region changes shape as the window crosses a number, which reads
as a fault rather than a decision.

What it was avoiding is a real thing — a line down a pane that scrolls is a
stop where the week does not end, and the corner curves over the column under
it — but it is also what every rounded scroll pane does, and it costs less
than a box that appears and disappears.

### `data-week` goes with it

One rule reads the attribute and nothing reads the flag behind it, so the
attribute, the `crowded` value `fit` keeps and the `crowded` entry on
`Rux.schedule` all come out. `fitColumns` keeps its own internal answer,
which is what decides whether the day columns take the remainder.

### The compact board keeps dropping the edge

There the board is the screen: the shell header above and the grid's last rule
below already draw the line the edge would, and the corners have no page to sit
on. That reason is untouched, and so is the last-rule token it trades against.

### Nothing else zeroes the radius token

The selected trip's shortcut bar sits inside the schedule's column and inherits
`--scheduler-surface-radius` from it, so zeroing the token for the column
squares the bar too. The compact board wants exactly that, for the docked
sheet. No other state does, and with the exception gone no other state sets it.

### A panel in front changes nothing

No rule then asks whether a region is beside the week, so the schedule behind a
panel in front draws what it draws everywhere else.

## Questions

- **Does the corner cutting the top of a day column read right when the week
  scrolls under it?** It is the one thing this gives up, and only looking
  answers it. If it does not, the answer is a square top-right corner on a
  scrolling pane, not the whole outline.

## Tasks

- [ ] Take the crowded rule out of `scheduler/theme.css`, and the `data-week`
      write, the `crowded` value and its `Rux.schedule` entry out of
      `scheduler/app.js`.
- [ ] Read the schedule in geist at 1440, 1000, 920 and 700 with nothing else
      open, then with the roster, the trip editor and the document viewer, and
      confirm the box never changes.
- [ ] Select a trip at each of those widths and confirm the shortcut bar keeps
      its corners, then check the phone still squares both it and the board.
- [ ] Read the same widths in ant-dark, g100, g10 and spotify-dark, which draw
      no edge and must stay unchanged.
