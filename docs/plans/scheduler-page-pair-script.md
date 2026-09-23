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
- **The shared part is what the five copies hold today:**
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
- **Save has one shape for every page:** compare, write with `.select()`, load
  the returned row, then read back. A read-back that fails says the record
  saved and asks for a reload. The Customers and Locations pages already
  save this way.
- **A table with `updated_at` compares it, and one without compares the whole
  row,** chosen by the page, as `contacts` and `buses` differ today.
- **Nothing a person sees changes.** Every page keeps its words, ids and
  layout, so the change is judged by the pages working as they do now.
- **Pages move one at a time,** Customers first, since it is the smallest and
  compares `updated_at`. Each move is its own commit, tested signed in before
  the next.

## Questions

- Should Buses and Drivers move in this plan? They are the two largest pages
  and carry modals the others lack: days out, time off and the photo.

## Tasks

- [ ] rux answers the question above and says go.
- [ ] Write `scheduler/pair.js` and move Customers onto it.
- [ ] Move Locations, then Contacts, onto it, each tested signed in.
- [ ] Move Buses and Drivers onto it, if the answer says so.
- [ ] Say in `scheduler/README.md` what `pair.js` holds.
