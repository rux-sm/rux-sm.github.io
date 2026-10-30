---
type: plan
---

# Plan: The board scrolls through the days

## Goal

The board's days scroll sideways without end, the way a finger or a
trackpad moves, so a person reads from one week into the next without
pressing an arrow and waiting for the board to redraw. Bus heads stay
pinned on the left. Paging a week at a time stays as the default until
scrolling has proved itself.

## Decisions

- **It is a View option, Scroll continuously, off until turned on.** The
  browser keeps it in `scheduler.view` under a new key, beside the week
  start. The board is production and used all day, so paging stays the
  default.
- **The strip is drawn from the payload the read already holds.** `read()`
  fetches `NEAR_DAYS` either side of the week asked for, nine weeks in all,
  and `render()` draws any number of days, counted from the range it is
  given. So a strip needs no new query, and `cached` and `holds` keep
  deciding when the network is asked.
- **The strip's length is measured before anything is built on it.** Nine
  weeks across the whole fleet is about eight times the bars of one week.
  If `render()` takes more than 50 ms over nine weeks of real data in Chrome
  on this Mac, the strip is three weeks: the week in view and one either
  side. The read's window does not change either way.
- **The strip moves when scrolling stops, never during it.** On `scrollend`,
  if the visible days are within a week of either end, the strip is drawn
  again from the cache, centred on the week in view. `scrollLeft` moves by
  the same number of days, so the same day stays under the same pixel.
  Setting `scrollLeft` mid-scroll stops a touch fling on an iPhone, and
  replacing the grid under a trackpad's momentum makes it stutter.
- **Seven days are in view, whatever Two weeks says.** A day is as wide as
  `fitColumns` in `app.js` makes one of seven, or the theme's fixed width
  where it sets one, as rux-dark does. Two weeks goes on paging the board
  and has no say here. In this mode the frame is never held to the week's
  width. The board fills its pane, and the grid is always wider than the
  pane, so it always scrolls.
- **A stop always snaps to the nearest day edge,** with `scroll-snap-type:
  x mandatory` and a snap point on each day. Seven days exactly fill the
  pane, so a stop between edges would leave a sliver of a day at both
  sides. If that feels sticky on a trackpad, `proximity` is the one-word
  alternative: it snaps only a stop already close to an edge.
- **A row grows only where its trips stack in view, as it does when
  paging.** Lanes are assigned across the whole strip, so a bar never
  changes lane as you scroll. Each row's height follows the most lanes
  among its bars in view, set again when scrolling stops, so a busy week
  off screen does not make the row tall.
- **Phones keep paging.** Below md the option does nothing, and the swipe
  slides a week as now, because a phone's fling and the strip's move are
  the risky pair. A narrow window on a computer scrolls like a wide one.
- **The week in view is the seven days from the leftmost whole day
  visible.** The week label, Print week, the presence note and New trip's
  first day all read it, where they read `cursor` today.
- **The arrows scroll smoothly by seven days.** Today, the week picker
  and a trip link scroll to the first day of the week containing that day,
  by the week-start setting: Monday, Sunday or Today.
- **A trip that crosses a week edge is one bar.** The strip has no week
  edges to clip it at. This is the one place the drawing reads differently
  from paging.
- **Nothing moves under someone's hands, as now.** A live refresh, a save
  or a reopened trip redraws with the leftmost visible day pinned.
  `barsInHand` and `drawOwed` hold a redraw while a bar is dragged. The
  drag's own auto-scroll at the pane's edges is kept.
- **On a computer, the browser's own scrolling replaces the compact board's
  swipe paging.** `fitColumns` stops setting `touch-action: pan-y`, and the
  swipe handler stands down. Paging mode and phones keep both as they are.

## Questions

None open.

## Tasks

- [ ] Time `render()` over nine weeks of real data on :8641 in Chrome, and
      set the strip's length from it.
- [ ] Add the View option, and draw the strip with each day's width fixed
      in `fitColumns` and a snap point on each day, scrolled to the first
      day of `cursor`'s week.
- [ ] Move the strip on `scrollend` from the cache, pinning the leftmost day.
- [ ] Make the week label, Today, the arrows, the week picker, Print week
      and New trip's day follow the week in view.
- [ ] Keep the scroll position through a live refresh, a save, opening a
      trip from a link and a dragged bar.
- [ ] Assign lanes across the strip, and size each row by its lanes in view
      when scrolling stops.
- [ ] Leave the option inert below md, so phones keep the swipe.
- [ ] Say what the option does in `scheduler/README.md`, beside the compact
      board's swipe, and in `scheduler/docs/screen-inventory.md`'s view
      options.
- [ ] Check it on :8641 in Chrome: a wide and a narrow window, a phone
      width in an iframe still paging, rux-dark's fixed days, Two weeks and
      Fill the window turned on beside it, and a refresh arriving mid-scroll.
