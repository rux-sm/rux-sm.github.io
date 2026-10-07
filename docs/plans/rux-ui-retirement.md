---
type: plan
---

# Plan: Retire rux-ui

## Goal

The office works in the scheduler alone. Nobody opens rux-ui's app, nothing
in the scheduler is shaped by what rux-ui reads or writes, and every link a
driver or a customer already holds still opens.

## Decisions

- **rux-ui is retired.** The scheduler is the one app that edits trips, so a
  scheduler change is no longer held to what rux-ui does with the same row.
- **Nothing is turned off until what only rux-ui does has a home or a no.**
  Each thing on the list below is built in the scheduler or dropped by rux,
  and rux-ui stays up until the list is empty.
- **What only rux-ui does:** the yard, the bus needs and the billing steps
  in its Settings; pay per seat; ticketed trips, their ticket options and
  the passenger list; the self-organized billing type; the itinerary's
  Confirm mark; the Tasks page; the printed week schedule; the two-week
  board; and the notifications panel.
- **The pages people outside the office open keep their addresses.** A
  driver's link opens rux-ui's `driver.html`, and `maintenance.html`,
  `m.html`, `d.html` and `doc.html` are in links already sent, so each gets a
  page on this site and its old address a redirect to it.
- **The repository is archived, not deleted,** once nothing links to it, so
  its history stays.
- **Columns and tables only rux-ui used are left in place.** Dropping one is
  its own change, shown to rux as SQL, after the app is off.

## Questions

- Which of the things only rux-ui does are still used, and which are
  dropped: pay per seat, ticketed trips and the passenger list, the
  self-organized billing type, the itinerary's Confirm mark, the Tasks page,
  the printed week schedule, the two-week board and the notifications panel?
- Is rux-ui opened for anything not on that list?

## Tasks

- [ ] Find every address on rux-ui that a sent link uses, and what
      `scheduler/share/driver.html` lacks beside rux-ui's `driver.html`.
- [ ] Give the driver's page a home on this site, point `DRIVER_LINK` in
      `scheduler/drivers.js` at it, and redirect the old address.
- [ ] Redirect `maintenance.html`, `m.html`, `d.html` and `doc.html` on
      rux-ui to this site's pages.
- [ ] Add the yard, the bus needs and the billing steps to the scheduler's
      Settings page.
- [ ] Build each thing rux keeps from the list, and delete from the screen
      inventory each one rux drops.
- [ ] Take out of the scheduler what it does only for rux-ui: the comments
      and rules that name it in `scheduler/*.js`, and the columns it writes
      for rux-ui alone.
- [ ] Say rux-ui is retired in `AGENTS.md`, the root `README.md`, the
      scheduler's inventories and `developer/CLAUDE.md` in `~/claude-config`.
- [ ] Archive the `rux-ui` repository.
- [ ] List the tables, columns and triggers only rux-ui used, and show rux
      the SQL that drops them.
