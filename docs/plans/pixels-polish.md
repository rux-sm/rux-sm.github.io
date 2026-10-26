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
- **Me shows two goals first: a rift cleared and a solve with no
  mistakes.** A rift cleared is worked out from the results already kept;
  no mistakes needs the mistakes kept with each result, a database change
  applied as its own migration.
- **Once today's puzzle is solved, its tile counts down to tomorrow's,** and
  shows the days in a row.
- **The front page says when a friend beats your best time on a puzzle,**
  from a new database function returning friends' recent bests, applied as
  its own migration and given to the player's key alone.
- **An iPhone shows the logo's star on the page's colour while Pixels
  opens.**
- **How to play's board to try replaces the lesson puzzle,** so there is one
  way to learn.

## Questions

None open.

## Tasks

- [ ] Answer a touch on the board as the finger lands, and stop the board
  scrolling the page.
- [ ] Cut the buttons to two and a link in Design, and move every Pixels
  page onto them.
- [ ] Turn the maker's toolbar into a bar like the game's.
- [ ] Give Friends, a rift with nothing found and a player with no mana an
  empty state each.
- [ ] Rewrite How to play as three steps with a board to try, and retire the
  lesson puzzle for it.
- [ ] Count down to tomorrow's puzzle on the Today tile once it is solved.
- [ ] Keep the mistakes with each result, as a migration shown first.
- [ ] Draw the two goals on Me: a rift cleared and no mistakes.
- [ ] Add the logo star launch picture for an iPhone.
- [ ] Write the friends' bests function, as a migration shown first, and
  show a friend's new best on the front page.
