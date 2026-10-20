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
- **The yard, the needs and the billing steps are edited on the scheduler's
  Settings page,** its Office tab, so nothing only rux-ui's Settings did is
  left without a home.
- **The rest of what only rux-ui does is dropped:** pay per seat, ticketed
  trips with their ticket options and passenger list, the self-organized
  billing type, the itinerary's Confirm mark, the Tasks page, the
  notifications panel, and a trip's notes on the driver's page, since notes
  are the office's.
- **The pages people outside the office open keep their addresses.** Five
  rux-ui addresses are in links already sent, and each has a page here that
  reads the same parameter: `driver.html?s=` and its old name `d.html` open
  `scheduler/share/driver.html`, `maintenance.html?s=` and its old name
  `m.html` open `scheduler/share/maintenance.html`, both on the same tokens,
  and `doc.html?id=` opens `scheduler/share/document.html`. Each old address
  is a redirect to its page here that carries its parameters.
- **`intake.html` is dropped with the app,** because it is a staff page
  behind a log-in, not an address in a sent link.
- **The scheduler's driver page already does what rux-ui's does, except a
  few things nobody relies on:** the link's date range and last-updated line,
  a document viewer with Print in the page, a Try again on a trip that will
  not load, and a seat's instructions for any role but relief, which only
  rux-ui can write, since the scheduler's editor gives only a relief seat a
  note. No coming trip has a seat with instructions, and every coming
  itinerary is labelled Itinerary exactly, as the scheduler's page reads it.
- **The repository is archived, not deleted,** so its history stays, and
  GitHub Pages still serves its redirects, the front page's to the board.
- **Columns and tables only rux-ui used are dropped as their own change,**
  shown to rux as SQL and applied on a yes.

## Questions


## Tasks

- [ ] List the tables, columns and triggers only rux-ui used, among them
      `itinerary_confirmed`, `is_self_organized` and `trip_passengers`, which
      no scheduler page reads, and show rux the SQL that drops them.
