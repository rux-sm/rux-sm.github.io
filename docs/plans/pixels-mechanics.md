---
type: plan
---

# Plan: Pixels rewards, made simple

## Goal

A player always knows what they get for playing: every solve adds a sprite
to their collection, every rift finished gets a mark, every seven daily
puzzles get a reward, and making a puzzle for friends costs nothing and
shows who solved it.

## Decisions

- **Making a puzzle is free.** Mana goes from the database, every page and
  `pixels/docs/profiles.md`. The limit of five rifts of 15 puzzles stays.
- **Sprites are the collection and the progress.** Each puzzle solved is one
  sprite, as now.
- **Fairies stay optional help.** They are never needed to finish a puzzle,
  and the game never asks a player to spend one.
- **A finished rift gets a star in its tile's corner,** shown as a picture
  first, and a course rift still gives three fairies as a bonus.
- **Every seven daily puzzles solved give one fairy,** counted from the days
  already kept, so a missed day loses nothing.
- **A maker sees how many players solved each puzzle.** Reactions wait until
  solve counts are in; no fairy for each solve of a player's puzzle.
- **Collection is a section on Me,** so the bottom bar keeps its four places.
- **Actions say what they do:** Create puzzle, Play, Use a fairy and
  Collection.
- **Rewards are counted by the database from what is there,** as fairies are
  now, so nothing can be earned twice or lost.

## Questions

None open.

## Tasks

- [ ] Show rux the migration that removes mana from `pixels_keep_puzzle`,
  `pixels_me` and `pixels_mine` and drops `pixels_mana`, and apply it on a
  yes.
- [ ] Take mana off Create, the maker, the finish bar and the docs, in the
  same push as the migration.
- [ ] Draw the finished-rift star on its tile.
- [ ] Add a fairy for every seven dailies to `pixels_fairies`, as a
  migration shown first, and say `+1 fairy` on the finish bar.
- [ ] Show each puzzle's solve count on Create.
- [ ] Rename the actions to Create puzzle, Play, Use a fairy and Collection.
- [ ] Build Collection on Me: every sprite found, grouped by rift.
