---
type: plan
---

# Plan: Pixels puzzle sheet, the whole course in one Aseprite file

## Goal

rux draws every puzzle of the course in one Aseprite sheet, a row to each
rift, so a rift's fifteen and the climb from rift to rift are seen side by
side while they are drawn. One command checks each puzzle as the Pixelator
would and, on rux's yes, saves it over its placeholder in the database.

## Decisions

The sheet:

- **One file, a row to each rift, rift 1 at the top,** fifteen cells across
  with the boss last.
- **A row's cells are its rift's size:** rift 1's first five are 5 by 5 and
  its other ten 10 by 10, rift 2's are 10 by 10, rifts 3 to 10's are 15 by
  15 and rifts 11 and 12's are 20 by 20, as
  `docs/plans/pixels-standard-set.md` sets the course.
- **Cells stand two squares apart,** so a frame round each lies in the gap
  and never touches a drawing.
- **A Guide layer** draws each cell's frame, the boss's in another colour,
  and at the left of each row its number and name in small pixel letters.
  It is never read.
- **Each cell is a slice named for its enemy,** from the placeholder rows
  already in the database, so a name shows when a cell is hovered and the
  import knows which puzzle a cell is.
- **Two layers are read.** `squares` is the answer: any ink is a square to
  fill. `picture` is the finished picture in colour, every square of the
  cell painted, as the Pixelator's colour step is now.
- **The sheet starts with every puzzle already drawn,** read from the
  database, so it is the whole course and an import changes only the cells
  that differ.
- **It is painted from the sixty inks,** indexed to them as every template
  is.

The import:

- **A cell is checked as the Pixelator checks it,** by `pixels/app.js`'s
  own line solver: solvable by logic alone, how hard, how much the first
  look gives and how much is filled. One that fails is listed with why and
  is not saved.
- **rux sees the list and says yes before anything is written:** each
  changed cell's rift, name, difficulty and whether it passes.
- **A puzzle is saved over its placeholder,** the row of that name in that
  rift, keeping its place, its letter and whether it is on. A new puzzle is
  saved off, so Manage's switch publishes it, as now.
- **One statement writes them all,** through the Supabase connection, and
  returns how many it changed, after a read-only check of the same rows.
- **A rift or the whole course can be imported,** by naming the row.
- **The Pixelator stays** for a player's own rifts and for one puzzle at a
  time.

## Questions

1. The sheet holds every answer. Should it be committed to this public
   repository, where anyone could read the course's answers, or kept out of
   it, in iCloud Drive where Aseprite opens it and it is backed up?

## Tasks

- [ ] Find how the import runs `pixels/app.js`'s solver on the Mac, where
      app.js expects a browser page, without a second copy of the solver.
- [ ] Write the sheet's template tool: the rows, the cells, the Guide layer
      with frames and labels, a slice per enemy, and the puzzles already
      drawn, from a read of the owner's course.
- [ ] Write the import: read the sheet, check each changed cell, print the
      list, and on a yes write the one statement.
- [ ] Prove it on rift 1: change one drawn puzzle on the sheet, import it,
      and see it in Manage and played on :8641.
- [ ] Say in `pixels/docs/drawing-the-art.md` how the sheet is drawn and
      imported, and correct `docs/plans/pixels-standard-set.md` where it
      says no tool loads the puzzles.
