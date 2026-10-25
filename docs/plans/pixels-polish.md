---
type: plan
---

# Plan: Pixels, polished as a finished game

## Goal

Pixels feels like a finished phone game: a solve is the best moment in it,
nothing pops in or jumps while a page loads, a touch answers the instant a
finger lands, every screen is drawn from one small set of buttons and
tiles, and there is always a next thing to do: a goal to reach, tomorrow's
puzzle, a friend's time to beat.

## Decisions

- **Each task is its own change, shown as options in the real page before
  it is built,** and checked in the iOS simulator from the home-screen icon.
- **The finish builds on what is there,** the picture filling in, the
  rift's tile with the sprite turning in, Share picture: it adds a count
  that ticks up on the rift, a New best that stands out from the line of
  words, and confetti of the picture's own colours, only where motion is
  allowed.
- **No page draws in two steps.** A page holds its shape with placeholder
  tiles of the right size while its data loads, and a page change fades in
  where the browser can.
- **A touch answers on the finger's landing,** not its lifting, and the
  board takes no scroll or zoom but the two-finger zoom it has.
- **Two buttons and a link:** Carbon's primary for the one thing a screen is
  for, its secondary for the rest, and a plain link for a way back or a
  small extra. The ghost-blue box and the other styles go. They are
  Design's, in `design/css/rux-game.css`, so every game gets them.
- **The maker's toolbar becomes a bar like the game's,** icons over words,
  and Clear's icon is not a refresh arrow.
- **Every list has an empty state that says what to do,** as the front page
  now has for a player who has found everything.
- **How to play is three steps, each a sentence and a tiny board to try,**
  and its words say fill and cross out, not strike and guard.
- **Goals are worked out from what the database already keeps** where they
  can be: days in a row, sprites found, a best time. A goal that needs
  something new stored waits on its question.
- **Once today's puzzle is solved, its tile counts down to tomorrow's,** and
  shows the days in a row.

## Questions

- Which goals first? Seven days in a row, a rift cleared, a 10×10 under two
  minutes and a solve with no mistakes are the candidates; no mistakes
  needs the mistakes kept with each result, a database change.
- May the front page show a friend's new best time over yours ("Mex beat
  your time on Mona Lisa")? It needs a database function that returns
  friends' recent bests, applied as its own migration.
- Who draws the launch picture an iPhone shows while Pixels opens: rux in
  Curve, or the logo star on the page's colour?
- Does How to play's tiny board replace the lesson puzzle, or stand beside
  it?

## Tasks

- [ ] Show the finish's options: the ticking count, a New best mark, and the
  picture's confetti; build the one chosen.
- [ ] Hold every page's shape while it loads: placeholder tiles on Play, a
  rift, Create and Me, and Me's numbers drawn with the page.
- [ ] Answer a touch on the board as the finger lands, and stop the board
  scrolling the page.
- [ ] Cut the buttons to two and a link in Design, and move every Pixels
  page onto them.
- [ ] Turn the maker's toolbar into a bar like the game's.
- [ ] Give Friends, a rift with nothing found and a player with no mana an
  empty state each.
- [ ] Rewrite How to play as three steps with a board to try.
- [ ] Count down to tomorrow's puzzle on the Today tile once it is solved.
- [ ] Draw the goals answered in Questions on Me.
- [ ] Add the launch picture for an iPhone.
- [ ] Show a friend's new best on the front page, if Questions says yes.
