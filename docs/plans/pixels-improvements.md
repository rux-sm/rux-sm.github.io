---
type: plan
---

# Plan: Pixels, closer to the best puzzle apps

## Goal

Pixels teaches a new player by playing, works with no connection, gives a
reason to come back each day, and reads easily, the way the best nonogram
and pixel-art apps do. A solve is never lost, a finished picture can be
shared, and Me shows how far a player has come.

## Decisions

Learning:

- **A first puzzle teaches by playing.** A player who has solved none is
  given a 5×5 lesson puzzle in place of How to play opening by itself: one
  step at a time it lights the line to look at and says in a short line
  what to do, and moves on when the player does it. How to play stays in
  Me's list for later.

Coming back:

- **The puzzle of the day goes on,** `DAILY` in `pixels/app.js`, with its
  card on Play and its days in a row. The leaderboard stays off, for the
  reason `docs/status.md` gives.
- **Me shows a player's numbers:** sprites found, rifts cleared, days in a
  row, and their best time on a 10×10 and a 15×15.

Working anywhere:

- **Pixels plays with no connection,** from a service worker that keeps the
  pages, Design's files and the puzzles last sent. A solve made offline is
  kept in the browser and sent once the connection is back, and Play says
  how many are waiting.
- **The same queue keeps a solve whose save fails,** and tries it again,
  which closes the status item about a lost solve.

Sharing:

- **A solved picture can be shared** from the finish: the picture drawn
  large on a card with its name and time, as an image, through the
  phone's own share sheet, and copied where there is none.

Reading:

- **Error messages in the pixel theme are dark,** drawn on the theme's
  raised grey with its edge, where Carbon's light box stands out today.
  The change is Design's, in `design/css/rux-overrides.css`.

Not in this plan: the Pixelator's icons, its tool states, its name label and
its Empty badge, which the visual-pass session takes.

## Questions

1. Should long text use a plain font? `docs/plans/pixel-theme.md` decided
   Silkscreen everywhere, running text too. The best pixel games keep pixel
   letters for headings, keys and numbers and a plain font for sentences.
   Recommended: IBM Plex Sans, which Design already loads, for paragraphs,
   How to play and messages in `pixel-dark`; that changes the theme plan's
   decision.
2. Should there be a relaxed mode with no hearts, where a wrong square is
   only marked? Recommended: yes, as a switch in Me's list, its times kept
   apart from those played with hearts.
3. Is the shared card an image of the picture, or a grid of squares as text
   the way Wordle shares? Recommended: the image, since the picture is the
   reward.

## Tasks

- [ ] The lesson puzzle: its five steps, shown to a player with no solve,
  and How to play no longer opening by itself.
- [ ] The service worker and the queue of solves, offline and failed alike,
  with Play's line saying how many wait; the lost-solve status item goes.
- [ ] The puzzle of the day switched on and checked: its card, its days in
  a row, and a day's puzzle drawn by the owner.
- [ ] Me's numbers.
- [ ] Sharing a solved picture from the finish.
- [ ] Design: the pixel theme's dark error message, and the plain font for
  long text if question 1 says so.
- [ ] The relaxed mode if question 2 says so.
- [ ] `pixels/README.md` and `pixels/docs/` say each change, in the commit
  that makes it, and each is checked in Chrome on :8641 at phone width,
  offline included.
