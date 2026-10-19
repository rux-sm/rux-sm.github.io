---
type: plan
---

# Plan: Pixels' play screen, Continue and the owner's bar

## Goal

On a phone, three screens of Pixels read as one finished game. The play
screen sits deliberately from top to bottom, with no empty band above the
hearts. The front page leads with where Continue goes. The owner's bar of
places has words under its icons, as every player's already has.

## Decisions

The play screen:

- **The game hangs from the top, and its keys stand at the foot.** Today
  `pixels/app.css` centres the whole game in the window's height, which on a
  phone leaves about 116px empty above the hearts. Instead the status row
  sits at the top, the board under it, and Fill and X with the key row sit
  just above the home bar; spare height falls between the board and Fill
  and X, where the thumb does not need to reach.
- **One status row: the hearts, then the clock.** The clock leaves the
  board's corner, which keeps only the picture so far.
- **Restart moves onto the Pause cover,** beside Resume and Exit, so one
  stray tap cannot empty the board. The key row is Exit, Pause, Hint, Undo
  and Redo.
- **Exit and Pause stay in the key row, with no bar along the top,** because
  the key row is where the thumb already is; the consistency pass put them
  there on purpose.
- **Hint shows its word whenever its fairy count is shown,** so the fairy
  icon is never alone.

The front page:

- **Continue becomes a card under the logo,** in place of the button fixed
  above the bar. It shows the puzzle's square or letter, the word Continue,
  the puzzle's letter and size, and its rift's name and bar, and the whole
  card plays that puzzle. The rift tiles follow under it.
- **The rift tile's Next tag goes,** because the card above names that rift.
- **The card is built from Design's rift tile** (`game-` in
  `design/css/rux-game.css`) where its parts fit, and any part it lacks is
  added to Design with invented content, never a local rule on a `game-` class.

The owner's bar:

- **Manage and Players leave the bar below 66rem and become rows in Me's
  list,** so the owner's bar is the players' four, Puzzles, Friends, Draw and
  Me, each with its word. Design already shows the words when a bar has four
  places or fewer, so Design's rule does not change.
- **The wide screen's header keeps Manage and Players** as links, because it
  has room for six.
- **The current place keeps its raised key,** which Design's pixel theme
  draws on purpose.

## Questions

1. What does the red bar beside the hearts become? It is the enemy's health,
   which means nothing while `WORLD` is off and no enemy is drawn. (a) Hide it
   unless `WORLD` is on. (b) Keep it as progress, in a calm colour, with
   "12 left" beside it. Recommended: (a).
2. Is the picture so far still wanted in the board's corner once the clock
   leaves it? It starts empty, which reads as a missing picture. (a) Keep it,
   drawn with a faint grid so an empty one reads as a small board. (b) Drop
   it and give the corner nothing. Recommended: (a).
3. Is two taps, Me then Manage, fine for the owner's desk on a phone?

## Tasks

- [ ] Play: anchor the game to the top and its keys to the foot in
  `pixels/app.css`, keeping the board's size rules; measure at 402×812 with
  a 34px home bar, and on a 15 and a 20 board.
- [ ] Play: the status row of hearts and clock, the corner per question 2,
  and the red bar per question 1, in `pixels/play.html`, `pixels/play.js` and
  `pixels/app.css`.
- [ ] Play: Restart onto the Pause cover, with Undo after it still bringing
  the board back; Hint's word beside its fairy.
- [ ] Front page: the Continue card in `pixels/puzzles.js`, Design's part for
  it if one is missing, and the fixed button and the Next tag gone.
- [ ] Owner's bar: Manage and Players out of the bar below 66rem on every
  Pixels page, and into Me's list for the owner.
- [ ] `pixels/README.md` says each change, in the commit that makes it.
- [ ] Check each screen in Chrome on :8641 at phone width, as a player and
  as the owner, with `npm run check -- --full` passing.
