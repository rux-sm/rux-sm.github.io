---
type: plan
---

# Plan: show and set a driver's status on the trip bar

## Goal

Each driver on a bar shows an icon for their role and a colour for their
status: sent, confirmed or declined, as rux-ui's bar does. Dispatch sets the
status from the scheduler, and both boards show the same status while both are
in use.

## Decisions

- **The status is read from `trip_driver_statuses`** through
  `get_trip_driver_statuses`, in one call for the week's trip ids when the
  board loads. That table is where rux-ui reads and writes the status, and the
  driver share link writes it too.
- **No database change.** The two functions and the five states already exist:
  `off`, `pending-assignment`, `pending-response`, `confirmed` and `declined`.
- **A status belongs to a driver.** A row is keyed by trip, driver, leg and
  role, so an empty role has no status to show.
- **Writes use `sync_trip_driver_statuses` with the trip's full list.** The
  function deletes every row the list leaves out, so a write for a single
  driver would erase the others.
- **A role the assignment turns on but no driver fills shows its icon alone,
  in red**, to say a driver is still needed; the tooltip says which, such as
  "Co-driver needed". The roles come from `trip_assignments.active_roles`,
  and an empty driver role replaces the row's "No driver" text.
- **A driver with no status row shows the `role:state` rux-ui once saved in
  `active_roles`**, as rux-ui does, so 29 past trips look the same on both
  boards.
- **The drivers row lists drivers in role order:** driver, co-driver, relief
  start, relief end. Today the row shows names only, and the scheduler reads
  `trip_drivers.role` but does not use it.
- **One icon per driver, before the name, and the icon shows the role:**

  | Role | Carbon icon | How it reads |
  | :--- | :--- | :--- |
  | Driver | `user` | a person |
  | Co-driver | `user` | the same person, as asked; the tooltip names the role |
  | Relief start | `channels` | two opposite arrows: a handover |
  | Relief end | `channels` | the same; the tooltip says start or end |

- **Relief is the one role that is not a person icon,** so it cannot be
  mistaken for a co-driver at 12px, and it needs no chip or label.
- **The icon's colour shows the status.** Off is the bar's text colour,
  pending response is amber, confirmed is green, and pending assignment and
  declined are red.
- **Colour is never the only signal:** a declined driver's name is struck
  through, and the tooltip and the bar's label give the role, the status, who
  set it and when, for example "Relief start · Confirmed by driver ·
  Sep 12, 3:40 PM".
- **A status is a disc in its support colour.** The icon is white on green
  and red in a light theme and dark in a dark theme, and dark on amber in
  every theme. Off has no disc.
- **The new icons go into Design's sprite first**, in
  `design/tools/build-icons.mjs`, and are then pasted into the pages with
  `tools/inline-sprite.mjs`.
- **Dispatch sets the status from a menu, not by clicking through states:** a
  Driver status item in the bar menu, with a submenu of one radio group per
  driver, like Color, for a status given by phone.
- **The two automatic changes stay where they happen today.** rux-ui's Driver
  week info turns a sent driver amber unless already confirmed or declined,
  and the driver's Accept on the share link turns them green; the board shows
  both on its next load.
- **Sending driver info is out of scope**, because the scheduler cannot send
  it yet. When it is built, sending marks a driver amber, as rux-ui does, and
  `scheduler/docs/screen-inventory.md` says so now. The Fleet tab assigns
  drivers, and a changed driver starts at Off.

## Questions

None open.

## Tasks

- [ ] rux sets a status on a real trip in the scheduler and checks rux-ui
      shows the same.
