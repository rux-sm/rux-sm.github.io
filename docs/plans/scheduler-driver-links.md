---
type: plan
---

# Plan: Make and send driver links from the scheduler

## Goal

Staff choose which of a driver's trips go on the driver's link, copy a
message to send them, and make, update or revoke the link, all on the Driver
view page, as rux-ui's Driver week info window does today. The links the
scheduler makes open the scheduler's driver page.

## Decisions

- **It lives on the Driver view page,** above the driver's page, not in a
  modal. What staff tick is what the page below shows, so they read the
  driver's page before they send it.
- **The trip list** is the driver's current and upcoming legs, soonest first,
  grouped by month, each with a checkbox, its date, destination, bus and
  role, and its answer: Accepted, Declined, Pending response or not sent.
  The legs already on the link start ticked.
- **The message** is written from the ticked legs the way rux-ui writes it:
  "Hi" and the driver's first name, the dates, then each leg's date, bus,
  role, times, pickup and destination, and the link at the end. It sits in a
  read-only text area with a Copy button.
- **Copy marks the ticked legs sent.** Each ticked leg the driver has not
  answered becomes Pending response, through `sync_trip_driver_statuses`,
  which shows yellow on both boards, as rux-ui's copy does.
- **Create link and Update link** save exactly the ticked legs, through
  `create_driver_schedule_share` and `update_driver_schedule_share`, with the
  link's dates set from the first and last ticked leg. Update keeps the same
  address, so a driver's saved link keeps working. Revoke, confirmed first,
  stops the link through `revoke_driver_schedule_share`.
- **The link opens the scheduler's page,** `scheduler/share/driver.html?s=`,
  always on the published site, since a driver's phone cannot reach a preview.
  A token works on both apps' pages, so drivers holding rux-ui links lose
  nothing.
- **A relief leg can be shared without a swap time,** because relief drivers
  often agree the handoff between themselves. The driver's card then says to
  coordinate the handoff with the driver they relieve, by name, in place of
  "details will be provided by dispatch", and the database's two link
  functions take it.
- **At most 50 legs a link,** the limit rux-ui keeps.
- **rux-ui keeps its Driver week info window** until rux has used this one
  for real, and then it is removed there.

## Questions

None open.

## Tasks

- [ ] Remove Driver week info from rux-ui, after reading its own `CLAUDE.md`.
