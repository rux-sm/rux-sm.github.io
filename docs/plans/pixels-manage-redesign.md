---
type: plan
---

# Plan: Manage as a list of rifts, one opened at a time

## Goal

Manage opens on a short list of the owner's rifts, each a row that says
how far along it is, and a rift's fifteen puzzles show only when it is
opened. The page loads and scrolls like a list, not a wall of 180 tiles,
and everything Manage does today still has a place: each puzzle's switch,
a rift's Published switch, its order, its picked players, its name, its
deletion, ticking to move or delete, Add puzzle, Unsorted and Dailies.

## Decisions

The list:

- **The page opens on the list.** A row is a rift in the owner's order:
  its rank and name, its size, how many of its fifteen are on, how many
  are drawn and how many are placeholders, and its Published switch.
- **A tap on a row opens that rift** and closes the one that was open, so
  one rift's pictures are drawn at a time. The open rift is kept in the
  address, `manage.html?rift=3`, so a reload or Back comes back to it.
- **Unsorted and Dailies are rows too,** at the foot of the list, opened
  the same way.
- **A rift's tools sit in its open view,** not in its row: the arrows that
  move it, the key for picked players, the pencil that renames it and the
  bin that deletes it, under its heading. The row keeps only what is read
  at a glance and the Published switch.

An open rift:

- **Its fifteen tiles, as now,** each with its picture, name, size and how
  hard it is, the boss marked, and its switch under it.
- **Edit and Play stay on every tile,** since they are a tap each.
- **Add puzzle stays after its tiles** while the rift has room.
- **Ticking stays,** and the bar of Move, Delete and Clear stays in view
  while a rift is open. A tick is kept when another rift is opened, so
  puzzles from two rifts can be moved together, and the bar says how many
  are ticked in all.
- **Tick all of a rift** is the box in its heading, as now.

What it does not change:

- **No function in the database changes,** and nothing a player sees.
- **Ranks, the course's order and the fifteen-on rule stay as they are.**

## Questions

1. Should the list show a small strip of each rift's fifteen pictures in
   its row, so a rift is recognised before it is opened, or words alone,
   which load fastest?
2. On a wide screen, should the open rift stand beside the list, so the
   list stays in view, or under its row, as on a phone?

## Tasks

- [ ] Build an options page with invented rows and tiles: the list with and
      without a strip of pictures, and an open rift beside and under the
      list, at phone and wide widths, for rux to pick from.
- [ ] Rebuild `pixels/manage.js` and its markup as the list and the open
      rift, with every tool of today in its new place.
- [ ] Keep the open rift in the address, and the ticks across rifts.
- [ ] Say the new page in `pixels/manage.js`'s header and `pixels/README.md`.
- [ ] Measure Manage's load in Chrome before and after, and prove each tool
      on :8641: a switch, Published, an arrow, the key, rename, delete, a
      move between rifts and Add puzzle, with a write shown before it is
      saved.
