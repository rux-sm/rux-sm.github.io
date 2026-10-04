---
type: plan
---

# Plan: more to play in Pixels

## Goal

Pixels gives a reason to open it every day and enough puzzles to stay in it:
more pictures, quick and long sizes, a puzzle of the day with a streak, and a
colour picture as the reward for solving. It is played on a phone first.

## Decisions

- **The phone is the first screen.** A 10×10 board gives 35px squares on a
  402px phone, which needs no zoom.
- **Pinch to zoom comes with 15×15, not before.** At 15 squares across a phone
  square is about 22px, too small for a finger, so that size ships with a
  two-finger pinch and pan; one finger still fills.
- **A puzzle's size is its own.** `pixels_puzzles` already has `width` and
  `height`; the pages read them in place of the fixed 10.
- **No undo.** A fill is always right in the classic game and an X comes off
  with a tap, so there is nothing an undo would take back.
- **No sound.** The phone's tick and the animations carry the feedback.

## Questions

- **How does a puzzle get its place in a level?** Today it is the order the
  puzzles were made, so a level cannot be rearranged. Recommended: the maker
  gets a level number, and a level lists its puzzles easy to hard by the
  maker's own grade.
- **Where does the puzzle of the day come from?** Recommended: the browser
  makes one from the date, a symmetric pattern the line solver has proved
  needs no guess, so there is one every day for ever and nobody has to draw
  it. The other way is one drawn picture a day, which runs out.
- **How is a colour picture made?** Recommended: the maker gets a second step
  after the puzzle is solvable, painting each square from a palette of eight
  colours, filled squares and background both. The puzzle stays black and
  white to solve, and the colour shows only in the finish.
- **Does the streak count any solved puzzle, or only the puzzle of the day?**
  Recommended: only the puzzle of the day, so a streak means coming back.

## Tasks

- [ ] Let the maker give a puzzle its level, and order a level by grade.
- [ ] Read each puzzle's `width` and `height` on the list, the game and the
      maker, and let the maker choose 5×5, 10×10 or 15×15.
- [ ] Pinch to zoom and two-finger pan on a board wider than ten squares.
- [ ] The puzzle of the day on the front page, and the streak beside it.
- [ ] The colour step in the maker and the colour finish in the game.
