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
- **Saving is its first part, on all five pages,** because it is where data
  goes wrong: `saveRecord` writes a record under an id made before its insert
  and hands back the row as saved, and `syncRows` brings a record's child rows,
  a bus's days out and a driver's time off, to what the page holds.
- **The rest of the shared part is what the five copies still hold:**
  - the helpers `$`, `el` and `svgUse`;
  - the notice and result banners;
  - the three-step sort header;
  - the search box and the whole-row click;
  - stacking the buttons on a phone;
  - a text field's and a combo box's error state;
  - the unsaved-changes guard and the conflict modal;
  - the staff sign-in gate at start-up.
- **A page hands the script its parts:** its table name, its element-id
  prefix, its columns, and functions to read the form, fill it and check it.
  The script calls them and never reads a page's own fields.
- **A table with `updated_at` compares it, and one without compares the whole
  row,** chosen by the page, as `contacts` and `buses` differ today.
- **Nothing a person sees changes.** Every page keeps its words, ids and
  layout, so the change is judged by the pages working as they do now.
- **Pages move one at a time,** each its own commit, checked by a trace of
  what the page does, run on fake data before and after the move and
  compared, then tried signed in. Buses and Drivers move last, since they
  carry the modals the others lack.

## Questions

None open.

## Tasks

- [ ] rux saves a bus with a day out, a driver with time off, and a new
      contact, customer and location, signed in.
- [ ] Move Locations, then Contacts, onto `pair.page`, as Customers is.
- [ ] Move Buses, then Drivers, onto them, each tested signed in.
