---
type: plan
---

# Plan: Pixels, one consistent game on a phone

## Goal

Pixels on a phone reads as one game: every page in one shell, the same part
drawn the same way wherever it stands, and a clear way out of play and the
Pixelator and back to where the player was. Nothing new is drawn, no font
changes, and the rules of play stay as they are.

## Decisions

- **The look stays.** pixel-dark, Silkscreen, the raised keys and cards, the
  pictures and the rules of play are kept; this pass is layout, states and
  the ways round.
- **The shell is Design's game shell.** On a phone the bar of places is on
  every page a player browses and on neither play nor the Pixelator, which
  are the board's alone; from 66rem the header's links stand in its place
  on every page. The bar and the page's bottom room keep clear of a phone's
  home bar.
- **The places stay as they are:** Puzzles, Friends, Draw and Me, and the
  owner's Manage and Players.
- **One selected state.** A square, a key or a field chosen is ringed once,
  2px in the focus colour; the place the page is in the bar is a raised key.
  Nothing chosen wears two outlines.
- **Cleared is gold and under way is blue,** on a rift's card, its bar and
  its page, and the Next tag alone marks the rift the game goes on to.
- **A rift's whole card is its link,** and every rift's picture is the same
  64px frame.
- **A pause stops the clock and covers the board,** as the start cover
  does, so nothing is read while the clock stands. It changes no rule of
  play: hearts, hints and the time kept are as they were.
- **Back from play goes where the player came from:** the front page after
  Continue, a rift's page after one of its squares, and Manage after its
  Play.
- **A player's row on Players is their picture, name and stats;** renaming
  is behind an Edit on the row, so no field stands open on every row.
- **The inks are hidden while drawing,** when they cannot be used, and stand
  open under the board for the colour step, a colour one tap away.
- **Me's list of the rifts a player has made is the creator's landing.** The
  Pixelator opens on its board, with no page before it.
- **An edit is kept as a draft, as a new picture is,** so leaving the
  Pixelator never loses a change and nothing asks before it goes.

## Questions

None open.

## Tasks

- [ ] Give play a Pause key: the clock stands, the cover lies over the board
      with Resume and Exit, and Exit leaves as Back does. The Pixelator's
      Back says Exit too, so the way out of either reads the same.
- [ ] Send Back from play to the page the player came from, remembered for
      the tab, with the puzzle's rift as it is now when there is none.
- [ ] Draw Players as rows of a picture, a name and the stats, and joining
      as one line of status with its one action, Close joining or Open
      joining.
- [ ] Put a friend link in a compact share card on Friends, its Share and
      Copy in it, and move Remove off each friend's row to a menu of its
      own, keeping its second tap.
- [ ] Move a rift card's Next tag off the line of the count to the line of
      its number, so it does not stand against the progress.
- [ ] Put renaming behind an Edit on a player's row.
- [ ] Hide the inks while drawing and open them for the colour step.
- [ ] Keep an edit of a saved puzzle as a draft of its own, picked up when
      the puzzle is opened again and dropped once it is saved.
