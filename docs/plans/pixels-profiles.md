---
type: plan
---

# Plan: Pixels profiles, friends and gates of your own

## Goal

Anyone invited makes a profile with a username and a PIN, draws their own
picture and their own puzzles in the Pixelator, and fills gates of their own. Adding a player as a friend puts
their gates on your front page. The owner can also keep one of their own
gates for a few picked players. Each stage below is finished and usable
before the next starts.

## Decisions

**A profile**

- **A profile is a player:** the row every player already has, with a
  username nobody else has. A guest's and an account's are the same kind.
- **Making one is typing a username and a PIN of four digits,** on the form
  a guest meets today.
- **The invite link is still the way to make one,** because a profile can
  write to the database, and the page is public.
- **A browser stays logged in by the key it keeps,** as it does today, and a
  player has a key for each phone, so a new phone logs no other one out.
- **Another phone logs in with the username and the PIN,** and needs no
  invite link.
- **Five wrong PINs lock that username's log-in for 15 minutes, and twice as
  long each time after,** because four digits are few enough to guess.
  Phones already logged in keep playing.
- **An account needs no PIN,** because it has the site's log-in.
- **A player draws their own picture,** 15 squares a side, in the
  Pixelator's inks. It is no puzzle, so it needs no single answer.
- **Until it is drawn, the picture is made from the username,** the same in
  every browser, so no player is a blank.
- **The picture stands beside the username everywhere a player is named:**
  the Friends page, a friend's gates and the profile page.
- **The profile page shows** the picture, the username, the gates made and
  the sprites found, and changes the picture, the username and the PIN.

**Gates of your own**

- **Every player has the Pixelator,** for their own puzzles and gates only.
- **A gate has an id and a maker.** A gate with no maker is one of the
  owner's built-in ones, which every player is sent as now.
- **A player starts with room for one gate and earns room for another with
  each gate they clear, up to five,** so playing is what unlocks making, and
  the database has a ceiling on what one invite can write. The database
  does the counting.
- **A gate holds 9 puzzles and is published with 3 or more.**
- **A player writes through database functions, never a table,** which
  refuse a wrong size, wrong squares, a long name, or one gate too many.
- **Only the browser checks that a puzzle has one answer,** because the
  database cannot run the solver. The owner can hide or delete any gate,
  and clear any player's picture.
- **A player's gate is theirs to rename, reorder and delete,** and it is
  played by their friends once they publish it.

**Who sees a gate**

- **One rule in one database function says whether a player sees a gate,**
  and every other function asks it, so a new kind of sharing is one change.
- **A gate has an audience, kept as a word:** `everyone`, `friends` or
  `picked`. More can be added without changing the tables.
- **The owner's gates are for everyone or for picked players,** chosen in
  Manage from the list of players.
- **A player's gates are for their friends.**
- **A time is kept only for a puzzle the player is sent.**

**Friends**

- **Friends is a page listing every player by username,** each with Add or
  Remove.
- **Adding is one-way and needs no answer:** I add Ana, and Ana's published
  gates are on my front page. Ana sees nothing change until she adds me.
- **A friend's gates come after the owner's** on the front page, each tile
  saying who made it.

**Finding the way round**

- **Every player has the same four places:** Puzzles, Friends, Pixelator
  and their profile. An account has them in the menu. A guest has no menu,
  so they get a bar of their own.

**The database**

- **Each change is SQL shown to rux and applied on a yes,** as a named
  migration, after it has run against a copy on this Mac.
- **`docs/database-access.md` says who may read and write what,** in the
  same commit as each change.

**Not in this plan**

- **A friend request that waits for an answer,** comments, likes and
  reports. The tables leave room for them.

## Questions

## Tasks

**Stage 1: a gate has an id, a maker and an audience**

- [ ] The migration: `pixels_levels` gains an id, a maker and an audience,
      and a puzzle names its gate by that id. Every gate there today is the
      owner's and for everyone. Tried on a copy first.
- [ ] One function says whether a player sees a gate, and `pixels_puzzles`
      and `pixels_record` ask it. The pages draw exactly what they do today.

**Stage 2: the owner's gates for picked players**

- [ ] The migration: who is picked for a gate.
- [ ] Manage: a gate's heading says who sees it, everyone or the players
      ticked in a list.

**Stage 3: profiles**

- [ ] A guest's bar with the four places, picked from a page that draws the
      choices.
- [ ] The migration: a key for each phone, the PIN kept as a hash, and the
      count of wrong tries with its lock. Tried on a copy first.
- [ ] The form a new player meets asks for a username and a PIN, and offers
      Log in to one who has both already.
- [ ] The profile page: the picture made from the username, the username,
      gates made, sprites found, and changing the username and the PIN.

**Stage 4: players make gates**

- [ ] The migration: functions that save, change and delete a player's own
      puzzles and gates, with every refusal in the decisions.
- [ ] The Pixelator opens to every player and saves through them.
- [ ] A player's own gates: name, order, publish and delete.
- [ ] The Pixelator draws a player's picture, and it shows wherever the
      player is named.
- [ ] Manage lists every player's gates for the owner, to hide or delete,
      and Players clears a picture.

**Stage 5: friends**

- [ ] The migration: who has added whom, and the list of players a player
      may read.
- [ ] The Friends page: every player, Add and Remove.
- [ ] The front page: a friend's published gates after the owner's, each
      saying who made it.

**Each stage**

- [ ] `pixels/README.md` and `docs/database-access.md` say what is true, and
      the stage is run in Chrome on :8641 and in the iPhone simulator, as
      the owner, an account and a guest.
