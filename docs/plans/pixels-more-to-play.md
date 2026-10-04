---
type: plan
---

# Plan: more to play in Pixels

## Goal

Pixels has a quick size and a long size beside its 10×10 puzzles, played on a
phone first.

## Decisions

- **Pinch to zoom comes with 15×15, not before.** A 10×10 board gives 35px
  squares on a 402px phone and needs no zoom; at 15 squares across a square
  is about 22px, too small for a finger, so that size ships with a two-finger
  pinch and pan while one finger still fills.
- **The numbers stay in view while zoomed.** The board becomes three parts,
  the column numbers, the row numbers and the squares, so the numbers slide
  with the squares along one edge and never leave the screen.
- **A touch fills on release on a board that zooms.** A second finger landing
  must not leave a stray fill behind, which could cost a star.
- **A puzzle's size is its own.** `pixels_puzzles` already has `width` and
  `height`; the pages read them in place of the fixed 10.
- **The puzzle of the day stays 10×10.**

## Questions

- **Does a level mix sizes, or is a size its own run of levels?**
  Recommended: its own run, so the front page reads Quick, then the levels,
  then Long, and nobody meets a 15×15 by surprise.

## Tasks

- [ ] Read each puzzle's `width` and `height` on the list, the game and the
      maker, and let the maker choose 5×5, 10×10 or 15×15.
- [ ] Split the board into its three parts, and add pinch to zoom and
      two-finger pan on a board wider than ten squares.
