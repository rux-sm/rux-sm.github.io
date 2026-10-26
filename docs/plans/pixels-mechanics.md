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
- **A finished rift gets a mark that stays on its tile,** and a course rift
  still gives three fairies as a bonus beside it.
- **Every seven daily puzzles solved give a reward,** counted from the days
  already kept, so a missed day loses nothing.
- **A maker sees how many players solved each puzzle first.** Reactions
  come after, if at all; no fairy for each solve of a player's puzzle.
- **Actions say what they do:** Create puzzle, Play, Use a fairy and
  Collection.
- **Rewards are counted by the database from what is there,** as fairies are
  now, so nothing can be earned twice or lost.

## Questions

- **What is a finished rift's mark?** A gold border on its tile, a star in
  its corner, or its picture drawn in full colour. Recommended: the star,
  shown as a picture first.
- **What do seven dailies give?** One fairy, or a new colour for the
  Pixelator. Recommended: one fairy, since it needs no new thing to build.
- **Reactions now or later?** Recommended: later, once solve counts are
  in and seen.
- **Is Collection its own place in the bottom bar,** or a section on Me?
  Recommended: a section on Me, so the bar keeps its four places.

## Tasks

- [ ] Show rux the migration that removes mana from `pixels_keep_puzzle`,
  `pixels_me` and `pixels_mine` and drops `pixels_mana`, and apply it on a
  yes.
- [ ] Take mana off Create, the maker, the finish bar and the docs, in the
  same push as the migration.
- [ ] Draw the finished-rift mark on its tile.
- [ ] Count every seven dailies in the database and give the reward on the
  finish bar.
- [ ] Show each puzzle's solve count on Create.
- [ ] Rename the actions to Create puzzle, Play, Use a fairy and Collection.
- [ ] Build Collection: every sprite found, grouped by rift.
