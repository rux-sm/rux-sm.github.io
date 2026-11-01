---
type: plan
---

# Plan: One tip for every card the board opens

## Goal

Every part of the board that opens a card when pressed opens the same tip
the bus number does: Carbon's high-contrast toggletip, with a caret pointing
at what was pressed, a head naming its one subject, and ruled rows under it.

Five parts open a card. Two already open the tip: the bus number and a
stop's tick. Three do not: a trip's alert badge, its update line and the
drivers on a bus out on the road. Those three are one card,
`#scheduler-bar-shortcuts`, drawn by `drawCard` and `drawLiveCard` in
`scheduler/data.js`.

## Decisions

- **The tip's rows are one family, `scheduler-tip`,** renamed from
  `scheduler-bus-tip`, because the bus, the stop and the three cards all
  draw them. The head, rows, marks and lamp keep their look.
- **The card keeps its own placing:** beside the trip's first day, on the
  other side where there is no room, the caret on the pressed part. Design's
  `popover.js` does no placing and the board's placer already does.
- **The surface is the toggletip's:** the inverse background and ink,
  Carbon's drop shadow and caret, no hairline. The floating card's
  `--card-*` tokens take the inverse values.
- **No Close and no trip head.** A press elsewhere, Escape or the same press
  puts a tip away, as the bus tip's does.
- **A tip is as tall as what it holds,** 14rem to 20rem wide as the bus tip,
  scrolling only past the board's height. The fixed 33rem card goes, since
  floating has no tabs to hold the same size for.
- **No pop.** A tip appears as the bus tip does, because Carbon's popover has
  no entrance motion.
- **Alerts:** the head is "Alerts" and its count. Each alert is one row, its
  icon and words, and the row is the press that goes where it is fixed. The
  "Details" word and the "Open trip" button go; a double-click or Enter opens
  the trip.
- **Updates:** the head is "Updates" and its count. Each update is one row,
  its words, then who and how long ago in the faded line the bus tip uses
  for a bus's make. The avatars go. Add update is the last row and opens the
  Updates window, as the bar's right-click Add update does.
- **Live:** the head is the bus, as in the bus tip: its disc, its number and
  what it is doing now. Then a lamp row for each warning, a small map, where
  it is and when last seen, the next stop and when it gets there, and one row
  per driver with their duty and drive time left.
- **The live tip's map is small:** the tip's full width and 8rem tall,
  fitted to the leg, with its map credit and no zoom buttons. Live map and
  Google Maps are link rows under it, for a bigger look.
- **The bus tip's live rows and the live tip come from one function,** so a
  bus on the road says the same in both. `bus-head.js` draws the bus tip's
  today.
- **The phone's docked sheet keeps its look and tabs,** because it is a sheet
  along the foot, not a tip. Its rows are the new ones.
- **This plan's tasks go before the
  [components page plan](scheduler-components-page.md)'s card task,** so the
  card moves out of `data.js` once, already a tip.

## Questions

- **What does Space on a trip open?** It opens the whole card today, with the
  trip's destination as its head. Recommended: the Updates tip, and the Live
  tip on a bus out on the road, as now.

## Tasks

- [ ] Rename `scheduler-bus-tip` to `scheduler-tip` in the scheduler's
      `data.js`, `bus-head.js`, `app.css`, `overrides.css` and
      `tools/check-bar.mjs`, with the bus and stop tips measured the same
      before and after.
- [ ] Give the floating card the toggletip's surface, caret and size, with
      no Close, no trip head and no pop.
- [ ] Draw the Alerts tip from the tip's rows.
- [ ] Draw the Updates tip, its Add update opening the Updates window.
- [ ] Draw the Live tip, its live rows shared with the bus tip.
- [ ] Add each tip's classes and words to `tools/check-bar.mjs`, and see all
      five tips in Chrome on :8641 on a dark and a light theme, with the
      phone's sheet unchanged.
