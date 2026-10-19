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
  its rank and name, its size, how many of its fifteen are on, and its
  Published switch.
- **Under its words, a row shows a strip of its fifteen pictures,** small,
  so a rift is known at a glance and its drawn and undrawn puzzles show.
- **A tap on a row opens that rift** and closes the one that was open, so
  one rift's tiles are drawn at a time. On a wide screen it opens beside
  the list, which stays in view; on a phone it opens under its row. The open rift is kept in the
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

None open.

## Tasks

- [ ] Measure Manage's load in Chrome before and after, and prove each tool
      on :8641: a switch, Published, an arrow, the key, rename, delete, a
      move between rifts and Add puzzle, with a write shown before it is
      saved.
