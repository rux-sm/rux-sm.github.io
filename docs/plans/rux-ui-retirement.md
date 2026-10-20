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
- **This plan is built next,** then `scheduler-documents.md`, then
  `scheduler-trip-shapes.md`, each waiting on the one before it.
- **Nothing is turned off until what only rux-ui does has a home.** That is
  its Settings: the yard, the bus needs and the billing steps.
- **The rest of what only rux-ui does is dropped:** pay per seat, ticketed
  trips with their ticket options and passenger list, the self-organized
  billing type, the itinerary's Confirm mark, the Tasks page and the
  notifications panel.
- **The pages people outside the office open keep their addresses.** Five
  rux-ui addresses are in links already sent, and each has a page here that
  reads the same parameter: `driver.html?s=` and its old name `d.html` open
  `scheduler/share/driver.html`, `maintenance.html?s=` and its old name
  `m.html` open `scheduler/share/maintenance.html`, both on the same tokens,
  and `doc.html?id=` opens `scheduler/share/document.html`. Each old address
  becomes a redirect that carries its parameters.
- **`intake.html` is dropped with the app,** because it is a staff page
  behind a log-in, not an address in a sent link.
- **The scheduler's driver page already does what rux-ui's does, except a
  few things nobody relies on:** the link's date range and last-updated line,
  a document viewer with Print in the page, a Try again on a trip that will
  not load, and a seat's instructions for any role but relief. No coming trip
  has a seat with instructions, and every coming itinerary is labelled
  Itinerary exactly, as the scheduler's page reads it.
- **The repository is archived, not deleted,** once nothing links to it, so
  its history stays.
- **Columns and tables only rux-ui used are left in place.** Dropping one is
  its own change, shown to rux as SQL, after the app is off.

## Questions

- Should drivers see a trip's notes? rux-ui's driver page shows them and the
  scheduler's does not. 155 coming trips have notes, which only rux-ui writes
  and which the office's updates have replaced.

## Tasks

- [ ] Show a seat's instructions on the driver's card for every role, as
      rux-ui's page does, in `scheduler/share/driver.js`.
- [ ] Redirect `driver.html` on rux-ui to `scheduler/share/driver.html`,
      which every link the scheduler makes or copies already opens.
- [ ] Redirect `maintenance.html`, `m.html`, `d.html` and `doc.html` on
      rux-ui to this site's pages.
- [ ] Add the yard, the bus needs and the billing steps to the scheduler's
      Settings page.
- [ ] Take out of the scheduler what it does only for rux-ui: the comments
      and rules that name it in `scheduler/*.js`, and the columns it writes
      for rux-ui alone.
- [ ] Say rux-ui is retired in `AGENTS.md`, the root `README.md`, the
      scheduler's inventories and `developer/CLAUDE.md` in `~/claude-config`.
- [ ] Archive the `rux-ui` repository.
- [ ] List the tables, columns and triggers only rux-ui used, and show rux
      the SQL that drops them.
