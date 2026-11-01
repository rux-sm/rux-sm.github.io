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
drivers' line on a bus out on the road. Those three are one card,
`#scheduler-bar-shortcuts`, drawn by `drawCard` and `drawLiveCard` in
`scheduler/data.js`. A driver's icon on a trip not yet on the road opens
nothing, and gets a tip too. Space, which opened the old card, becomes the
keyboard's way to move a trip to another bus, which only a drag can do now.

## Decisions

- **The tip's rows are one family, `scheduler-tip`,** renamed from
  `scheduler-bus-tip`, because the bus, the stop, the trip's tips and the
  driver's all draw them. The head, rows, marks and lamp keep their look.
- **The card keeps its own placing:** beside the trip's first day, on the
  other side where there is no room, the caret on the pressed part. Design's
  `popover.js` does no placing and the board's placer already does.
- **The surface is the toggletip's:** the inverse background and ink,
  Carbon's drop shadow and caret, no hairline. The floating card's
  `--card-*` tokens take the inverse values.
- **No Close and no trip head.** A press elsewhere, Escape or the same press
  puts a tip away, as the bus tip's does.
- **A trip's tips open from an icon, as Alerts does from its badge:**
  Updates from the chat icon that leads the update line, and a driver's tip
  from that driver's icon, a relief's arrow too. The rest of each line is the
  trip's, so a press there selects the trip, as anywhere else on the bar.
- **Each opening icon is a button named for its tip,** such as "Updates, 6",
  so Tab and Enter reach it. Its press area is 24px, Carbon's smallest
  target, with the icon drawn at 16px as now.
- **An opening icon shows it can be pressed:** the pointer, Carbon's ghost
  hover square behind it, and the selected look while its tip is open. It
  drops its hover label, because its tip says the same.
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
- **A driver's tip has one head at every stage:** their photo, or their
  initials, their full name, and one faded line under it. Each driver's icon
  opens that driver's own tip, so two drivers on one bus have two.
- **Before the trip, the driver's tip says whether the driver is set.** The
  faded line is their role, and Part-time where they are. Then their status
  with who set it and when, as the hover label says it today; a lamp row
  only for what stands in the way, a trip changed since they confirmed, another
  trip or time off, or a licence or medical card that runs out before the leg
  ends; their rest before this leg; and their phone as a link row.
- **On the road, the driver's tip says how the driver is doing,** the live
  card's drivers part with the driver as its head. The faded line is their
  duty now. Then their Drive, Shift and Cycle time left with each one's bar,
  their rest, a lamp row for each road warning the live card shows, the
  small map, the next stop and when they get there, and Live map and Google
  Maps as link rows.
- **The map is small:** the tip's full width and 8rem tall, fitted to the
  leg, with its map credit and no zoom buttons.
- **The bus's own state stays in the bus tip,** its engine, fuel, town and
  last reading, so the driver's tip never repeats it.
- **After the trip, nothing opens,** because a done trip's drivers carry no
  icon. A driver who declined keeps their icon, which opens the tip from
  before the trip, saying Declined.
- **The board already reads every line of the driver's tip but the photo:**
  `drivers` for the name, phone, type and card dates,
  `get_trip_driver_statuses` for the status, `driver-job.js` for a change
  since they confirmed, `clashes.js` for what stands in the way and the
  rest, and Samsara's reading for the road.
- **The photo comes from the `driver-photos` bucket, as the Drivers page
  reads it:** the board adds `photo_path` to its `drivers` read and signs a
  driver's link when their tip first opens, with the initials until it
  loads.
- **Holding Space carries the selected trip, as holding the mouse button
  does,** since the card Space opened goes. ↑ and ↓ move it to the bus above
  or below, and letting go drops it there through the drag's own drop: the
  unassigned row showing, its warnings, its saving mark and its Undo. Escape
  while holding puts it back unsaved, and a let-go with no arrow writes
  nothing. The held key's repeats are ignored, and days still change only in
  the editor.
- **The phone's docked sheet keeps its look and tabs,** because it is a sheet
  along the foot, not a tip. Its rows are the new ones.
- **This plan's tasks go before the
  [components page plan](scheduler-components-page.md)'s card task,** so the
  card moves out of `data.js` once, already a tip.

## Questions

None open.

## Tasks

- [ ] Rename `scheduler-bus-tip` to `scheduler-tip` in the scheduler's
      `data.js`, `bus-head.js`, `app.css`, `overrides.css` and
      `tools/check-bar.mjs`, with the bus and stop tips measured the same
      before and after.
- [ ] Make the chat icon and every driver's icon the openers in place of
      their whole rows, in `bar.js` and `road-bar.js`, each a named button
      with a 24px press area, a hover and no hover label.
- [ ] Give the floating card the toggletip's surface, caret and size, with
      no Close, no trip head and no pop.
- [ ] Draw the Alerts tip from the tip's rows.
- [ ] Draw the Updates tip, its Add update opening the Updates window.
- [ ] Draw the driver's tip before the trip, with the photo read from
      `driver-photos`.
- [ ] Draw the driver's tip on the road, with its small map, in place of the
      live card.
- [ ] Make a held Space carry the selected trip in `data.js`, ↑ and ↓ a bus
      at a time, the let-go dropping it through the drag's drop and Escape
      putting it back, with its writes proved by
      `scheduler/docs/proving-a-save.md` rather than a real move.
- [ ] Add each tip's classes and words to `tools/check-bar.mjs`, and see
      every tip in Chrome on :8641 on a dark and a light theme, with the
      phone's sheet unchanged.
