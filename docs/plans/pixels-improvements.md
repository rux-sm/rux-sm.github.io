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
  phone's own share sheet, and saved as a file where there is none.

Playing easy:

- **Relaxed is a switch in Me's list.** With it on, a puzzle has no hearts:
  a wrong square is marked and costs nothing. A relaxed solve finds the
  sprite and keeps a time only where none was kept, so it never replaces a
  time played with hearts.

Reading:

- **Error messages in the pixel theme are dark,** drawn on the theme's
  raised grey with its edge, where Carbon's light box stands out today.
  The change is Design's, in `design/css/rux-overrides.css`.
- **Sentences are in IBM Plex Sans in `pixel-dark`,** which Design already
  loads: paragraphs, How to play, notes and messages. Headings, keys, names
  and numbers stay in Silkscreen. `docs/plans/pixel-theme.md`'s font
  decision changes to say so.

Not in this plan: the Pixelator's icons, its tool states, its name label and
its Empty badge, which the visual-pass session takes.

## Questions

None open.

## Tasks

- [ ] The lesson puzzle: its five steps, shown to a player with no solve,
  and How to play no longer opening by itself.
- [ ] The service worker and the queue of solves, offline and failed alike,
  with Play's line saying how many wait; the lost-solve status item goes.
- [ ] Design: the pixel theme's dark error message, and Plex for sentences.
- [ ] `pixels/README.md` and `pixels/docs/` say each change, in the commit
  that makes it, and each is checked in Chrome on :8641 at phone width,
  offline included.
