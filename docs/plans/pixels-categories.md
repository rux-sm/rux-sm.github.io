---
type: plan
---

# Plan: organise Pixels' categories from the front page

## Goal

The owner can save a puzzle into no category, and can move a puzzle, rename
a category and delete one, all on the Pixels front page, beside the switches
and arrows already there.

## Decisions

- **A puzzle in no category has no level.** `pixels_puzzles.level` becomes
  empty for it, so no pretend category is kept to hold strays.
- **Unsorted is the owner's group for them,** one per board size, after that
  size's categories on the front page. No player is ever sent a puzzle in
  it, whatever its own switch says.
- **Save offers No category yet,** first in its list, so a picture can be
  kept before it has a home.
- **A puzzle moves from its own tile.** The tile's menu has Move to, which
  lists the categories of its size and Unsorted. A puzzle moved into a
  category with nine on arrives switched off, as a save does today.
- **A category is renamed from its heading,** by a pencil beside the arrows
  that opens one field in a small window.
- **Deleting a category keeps its puzzles.** They go to Unsorted, and the
  categories after it close the gap. Unsorted itself cannot be deleted.
- **Delete is one database function,** `pixels_delete_level`, so the move,
  the removal and the renumbering cannot stop half way. Moving and renaming
  write the tables directly, as the switches do.
- **The local preview does the same** in the browser's own storage, so every
  part can be tried with no log-in.

## Questions

- Should deleting a category keep its puzzles in Unsorted, as decided above,
  or ask each time whether to delete them too?
- Is one Unsorted group per board size right, or should it be one group for
  all sizes at the foot of the page?

## Tasks

- [ ] Database: let `level` be empty, make `pixels_puzzles` skip a puzzle
      with no level and no day, and add `pixels_delete_level`. Tried in
      PGlite first, then shown to rux as SQL.
- [ ] `data.js`: `move`, `removeLevel`, and a save with no level, in both the
      cloud and the local store.
- [ ] Front page: the Unsorted group, Move to on a tile, the rename pencil
      and the delete button on a category's heading.
- [ ] Maker: No category yet in the Save window.
- [ ] `pixels/docs/making-puzzles.md` and `pixels/README.md` say the new
      ways; the categories item leaves `docs/status.md`.
