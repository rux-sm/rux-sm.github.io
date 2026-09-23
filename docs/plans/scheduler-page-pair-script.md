---
type: plan
---

# Plan: one script for the scheduler's page pairs

## Goal

Buses, Drivers, Contacts, Customers and Locations share one script for what
every page pair does the same way, so a fix to saving, conflicts or the leave
guard is made once and reaches all five pages. `docs/plans/site-page-pair.md`
decides how the pair looks; this plan decides only where its behaviour lives.

## Decisions

- **One file, `scheduler/pair.js`,** loaded before each page's own script, as
  `places.js` is before `locations.js`. Each page's script keeps only what its
  record has and the others do not.
- **Saving is where data goes wrong, so it is shared first:** `saveRecord`
  writes a record under an id made before its insert and hands back the row as
  saved, and `syncRows` brings a record's child rows, a bus's days out and a
  driver's time off, to what the page holds.
- **`page()` holds the rest:** the notices, the list's search, sort and row
  click, a field's error state, the unsaved-changes and conflict modals, and
  the staff gate, named from the page's two words.
- **A table with `updated_at` compares it, and one without compares the whole
  row,** chosen by the page, as `contacts` and `buses` differ today.
- **Nothing a person sees changes.** Each move was checked by a trace of what
  the page does, run on fake data before and after and compared.

## Questions

None open.

## Tasks

- [ ] rux saves a bus with a day out, a driver with time off, and a new
      contact, customer and location, signed in, and leaves each with an
      unsaved change to see the modal ask.
