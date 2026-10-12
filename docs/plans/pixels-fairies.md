---
type: plan
---

# Plan: Pixels, fairies that help

## Goal

Help in a puzzle is a fairy: a thing a player earns, keeps and spends.
Clearing a rift of the course frees three, a fairy's hint adds no time, and
the count follows the player to any phone. Finding every sprite in a rift is
then worth something besides the next rift.

## Decisions

What a fairy is:

- **A fairy is one hint that adds no time.** It does what Hint does now: it
  lights the line where the numbers decide the most, or points at a wrong X.
- **With no fairy left a hint costs 30 seconds, as now,** so help is never
  out of reach.
- **A mistake costs what it costs now.** A fairy takes nothing back.
- **A fairy spent is spent.** Undo, Restart and leaving the puzzle give none
  back, because the line was seen.
- **A solved picture stays a sprite.** A fairy is the helper and a sprite is
  what is found, so the two words never meet.
- **The free hint as a puzzle starts is another thing,** and stays in
  `pixels-standard-set.md`.

Where fairies come from:

- **A new player has three,** so the first hard puzzle has help and the key
  explains itself.
- **Clearing a rift of the course gives three:** every sprite found in one
  of the owner's rifts that everyone is sent. Twelve rifts and the start
  make 39 for 180 puzzles.
- **A player's own rift and a friend's give none,** because three puzzles
  make a rift and two players could trade them for ever.
- **The database counts them from what is there, as it counts mana:** three,
  and three for each course rift with a result on every puzzle that is on,
  less the fairies used, and never under none. Only the number used is
  stored.
- **A rift that gains a puzzle is not cleared until that one is found,** so
  its three wait until then. A fairy already used is not owed.
- **Every player counts the same way, the owner too.**

What a player sees:

- **The Hint key carries a fairy and how many are left.** The word stays
  Hint, with no fairy too, so the key is one thing in every state.
- **The line under the board says which it was:** a fairy lit the row, or
  the row has squares to fill and 30 seconds were added.
- **The finish counts fairies apart from hints,** since only a hint adds
  time, and the tile of a rift just cleared says `+3 fairies`.
- **Me shows the fairies beside the sprites and the mana.**
- **How to play says it in its third step,** where it says what a hint
  costs.
- **The fairy is drawn in pixels in the game's inks,** by `app.js` as a
  portal is. No icon is added to Design.

The database:

- **One column and two functions.** `pixels_players.fairies_used` is how
  many a player has spent. `pixels_fairies` is the count, which no role runs
  by itself, as `pixels_mana` is. `pixels_use_fairy` takes one if there is
  one and answers with what is left, and the key may run it. `pixels_me`
  sends the count.
- **The page asks before it lights the line.** A hint waits for
  `pixels_use_fairy`. With no answer the hint costs its 30 seconds and says
  so, so a fairy is never used without being counted.
- **The count is the database's word and the use is the browser's,** as a
  time is. A player can only waste their own.
- **The local preview keeps its fairies in the browser,** as it keeps its
  results.

## Questions

1. Are three to start and three a rift the numbers?
2. Does a fairy only light the line, or does it also fill in what is certain
   on it? Filling makes each one worth more, and 39 are few.
3. Who draws the fairy? A first one can be drawn in code and replaced by
   rux's own.

## Tasks

- [ ] Write the migration and test it offline in PGlite: the column,
      `pixels_fairies`, `pixels_use_fairy` granted to the key by name, and
      `pixels_me` sending the count. A new player has three, a cleared
      course rift adds three, a friend's rift adds none, a fairy used takes
      one, and the count never goes under none. The SQL is shown to rux
      first, and `docs/database-access.md`'s check is run after it.
- [ ] Draw the fairy in `app.js` and put it with its count on the Hint key.
- [ ] Spend a fairy on a hint in `play.js`: ask the database, light the line
      with no time added, and fall back to 30 seconds with none left or no
      answer. Keep the fairies used in the kept game and say them on the
      finish.
- [ ] Say `+3 fairies` on the finish for a rift just cleared, and show the
      count on Me.
- [ ] Give the local preview its fairies.
- [ ] Add fairies to How to play, `pixels/README.md` and
      `pixels/docs/profiles.md`.
- [ ] Prove it on :8641 as a test player: use a fairy, read the count on a
      second browser, clear a rift and read three more.
