---
type: plan
---

# Plan: Pixels profiles, friends and gates of your own

## Goal

One loop, for anyone invited: I draw something, you solve it, and I see that
you did. A player has a picture and a profile, friends who came by their
invite, mana from the sprites they find, and gates of their own made with
it. Each stage below is finished and fun to use before the next starts.

## Decisions

**Finding the way round**

- **Every player has the same four places:** Puzzles, Friends, Pixelator and
  Me, in one bar, a guest and an account alike, because it is one game.
- **On a phone the bar is at the bottom,** each place its icon over its
  word, clear of the home bar. On a wide screen it is tabs along the top.
- **A page where a puzzle is played or drawn has no bar,** because the keys
  under the board are at the bottom too, and Back leaves it.
- **A place is in the bar once it is built:** Puzzles, Friends and Me now,
  and the Pixelator for the owner.
- **Manage and Players stay in the owner's menu.**

**A profile**

- **A profile is a player:** the row every player already has, with a
  username nobody else has. A guest's and an account's are the same kind.
- **Making one is typing a username,** as now, and nothing more, so the
  first minute is play.
- **A player draws their own picture,** 15 squares a side, in the
  Pixelator's inks. It is no puzzle, so it needs no single answer.
- **Until it is drawn, the picture is made from the username,** the same in
  every browser, so no player is a blank.
- **The picture stands beside the username everywhere a player is named.**
- **Me shows** the picture, the username, mana, the gates made and the
  sprites found, and changes the picture and the username.

**Friends**

- **Every player has an invite link of their own,** and that is the way in.
  It carries a code the player can renew, which closes the old link.
- **Whoever joins by a player's link is their friend, both ways, at once,**
  so a new player's front page is never empty.
- **Friends lists every player by picture and username,** friends first,
  each with Add or Remove. Adding there is one-way and needs no answer.
- **The owner can close joining for everyone,** and removing a player ends
  their link.

**Who sees a gate**

- **One rule in one database function, `pixels_sees`, says whether a player
  sees a gate,** and every other function asks it, so a new kind of sharing
  is one change.
- **A gate has an audience, kept as a word:** `everyone`, `friends` or
  `picked`. More can be added without changing the tables.
- **The owner's gates are for everyone or for picked players,** chosen in
  Manage from the list of players.
- **A player's published gates are for their friends.**
- **A time is kept only for a puzzle the player is sent.**

**Mana and gates of your own**

- **Every player has the Pixelator,** for their own picture, puzzles and
  gates only.
- **Finding a sprite gives one mana, and keeping a puzzle of your own costs
  one.** A player starts with nine, so the first gate is free, and clearing
  a gate pays for another.
- **Mana is counted by the database from what is there,** sprites found
  less puzzles kept, plus nine, so there is nothing to forge and deleting a
  puzzle gives its mana back. A drawing not yet saved costs nothing.
- **A player has at most five gates.** A gate holds 9 puzzles and is
  published with 3 or more.
- **A gate has an id and a maker.** A gate with no maker is one of the
  owner's built-in ones. A puzzle is in the gate of its own maker, size and
  place, so a player's first gate and the owner's can both be number one.
- **A player writes through database functions, never a table,** which
  refuse a wrong size, wrong squares, a long name, too little mana, or one
  gate too many.
- **Only the browser checks that a puzzle has one answer,** because the
  database cannot run the solver. The owner can hide or delete any gate,
  and clear any player's picture.

**The payoff**

- **A maker sees who cleared their gate,** on the gate's own page: each
  friend's picture, username, sprites found and best times.
- **A gate a player has not opened says New,** kept in their browser,
  because it is only a nudge.
- **A friend's gates come after the owner's** on the front page, each tile
  with its maker's picture and username.

**A second phone**

- **A PIN of four digits is set on Me, by a player who wants one,** and
  never asked at the door.
- **Another phone logs in with the username and the PIN.** A player has a
  key for each phone, so a new one logs no other out.
- **Five wrong PINs lock that username's log-in for 15 minutes, and twice as
  long each time after,** because four digits are few enough to guess.
- **An account needs no PIN,** because it has the site's log-in.

**The database**

- **Each change is SQL shown to rux and applied on a yes,** as a named
  migration, after it has run against a copy on this Mac.
- **`docs/database-access.md` says who may read and write what,** in the
  same commit as each change.

**Not in this plan**

- **A friend request that waits for an answer,** comments, likes, reports,
  and spending mana on anything but puzzles. The tables leave room.

## Questions

## Tasks

**Stage 4: mana, players' gates and the payoff**

- [ ] The migration: mana, and the functions that save, change and delete a
      player's own puzzles and gates, with every refusal in the decisions.
- [ ] The Pixelator opens to every player, shows mana and saves through
      them, and its place in the bar is everyone's.
- [ ] A player's own gates on Me: name, order, publish and delete.
- [ ] The front page: a friend's published gates after the owner's, with
      the maker's picture and username, and New on one not yet opened.
- [ ] A maker's gate page lists who cleared it and their times.
- [ ] Manage lists every player's gates for the owner, to hide or delete.

**Stage 5: a second phone**

- [ ] The migration: a key for each phone, the PIN kept as a hash, and the
      count of wrong tries with its lock.
- [ ] Me sets and changes a PIN, and the form a visitor meets offers Log in
      with a username and a PIN.

**Each stage**

- [ ] `pixels/README.md` and `docs/database-access.md` say what is true, and
      the stage is run in Chrome on :8641 and in the iPhone simulator, as
      the owner, an account and a guest.
