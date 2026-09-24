---
type: plan
---

# Plan: Pixels, a picture-logic puzzle game with its own puzzle maker

## Goal

A new app, Pixels, at `/pixels/`, with a tile on Home. It has two parts: a
game that plays 10×10 picture puzzles by the rules of Picross DS, and a maker
where rux draws 10×10 pixel art that becomes a puzzle in the game. It is built
from Design and plays well on rux's phone.

## Decisions

- **The name is Pixels, not Picross,** because Picross is Nintendo's trademark
  and this site is public. Header "Rux Pixels", prefix `pixels-`, commit scope
  `pixels`.
- **The rules are Picross DS's normal mode.** Each row and column shows the
  lengths of its runs of filled squares, in order. Tap fills a square; the
  second tool marks an X on a square that is empty. Filling a wrong square is a
  mistake: the square is marked X instead, and time is added to the clock, more
  for each mistake. A line whose numbers are all met greys them out. A solved
  puzzle shows its finished picture and its name.
- **Controls are a Fill / X switch plus drag.** Dragging paints the same tool
  along one row or column, like the DS stylus. On a keyboard, arrows move and
  two keys fill and mark.
- **The maker checks every puzzle can be solved by logic alone.** Many
  drawings have more than one answer that fits their numbers, which makes a
  puzzle that needs guessing. The maker solves it line by line as it is drawn,
  shows which squares logic cannot reach, and saves only a puzzle with one
  answer.
- **Puzzles live in the database,** in one table of puzzles and one of each
  account's solved puzzles and best times. A puzzle drawn on the phone then
  plays on the Mac, and nothing needs a file edited or a push. Staff-only
  access, as every table is.
- **A puzzle is stored as its name, its size and its squares**, so a 5×5 or
  15×15 size can come later without changing the table.
- **The board is the app's own component,** `pixels-board`, every colour a
  `--rux-*` token; the page around it, the puzzle list and the maker's
  buttons are Design's.

## Questions

- Is Pixels the name, or another word: Nono, Mosaic, Squares or Grid?
- Which look, from `pixels/specimen.html`: Ink, Accent or Tiles?
- Should the maker let you paint in colour, shown only once the puzzle is
  solved, as the DS reveals a colour picture? The puzzle stays black and white.
- Should the game also have Picross DS's free mode, where mistakes are not
  checked and you find them yourself when the picture is wrong?
- Should it start with a few puzzles made by me, or empty until you draw some?

## Tasks

- [ ] rux sees a Pixels tile on Home and opens a page listing the puzzles.
- [ ] rux plays a 10×10 puzzle on the phone by DS rules, with mistakes, the
      clock and greyed-out numbers, and sees the picture when it is solved.
- [ ] rux draws a picture in the maker, is told when it needs guessing, names
      it and saves it, and it appears in the list on the phone and the Mac.
- [ ] rux sees which puzzles are solved and the best time for each.
