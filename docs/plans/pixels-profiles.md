---
type: plan
---

# Plan: Pixels profiles, friends and gates of your own

## Goal

Anyone invited makes a profile by typing a username, draws puzzles in the
Pixelator, and fills gates of their own. Adding a player as a friend puts
their gates on your front page. The owner can also keep one of their own
gates for a few picked players. Each stage below is finished and usable
before the next starts.

## Decisions

**A profile**

- **A profile is a player:** the row every player already has, with a
  username nobody else has. A guest's and an account's are the same kind.
- **Making one is typing a username,** on the form a guest meets today.
- **The invite link is still the way in,** because a profile can write to
  the database, and the page is public.
- **A username alone never logs anyone in,** because then anyone who types
  it is that player. The browser keeps the player's key, as it does today.
- **A player comes back on another phone by their own link,** shown on
  their profile page, which carries the key as a home screen icon's does.
- **The profile page shows** the username, the gates made, the sprites
  found, and that link. The username can be changed there.

**Gates of your own**

- **Every player has the Pixelator,** for their own puzzles and gates only.
- **A gate has an id and a maker.** A gate with no maker is one of the
  owner's built-in ones, which every player is sent as now.
- **A player has at most 3 gates of 9 puzzles,** so the database has a
  ceiling on what one invite can write.
- **A player writes through database functions, never a table,** which
  refuse a wrong size, wrong squares, a long name, or one gate too many.
- **Only the browser checks that a puzzle has one answer,** because the
  database cannot run the solver. The owner can hide or delete any gate.
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

- **A password or PIN for guests,** a profile picture, comments, likes and
  reports. The tables leave room for them.

## Questions

1. **Coming back on another phone:** by the player's own link, which is my
   pick, because it needs nothing new and nothing to remember. Or a
   username and a PIN, which is easier to say out loud but needs a guard
   against guessing.
2. **Adding a friend:** one-way with no answer, which is my pick, because it
   is one tap and nobody waits. Or a request the other player accepts.
3. **The ceiling:** 3 gates of 9 puzzles each for a player. More or fewer?

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
- [ ] The profile page: username, change it, gates made, sprites found, and
      the link for another phone.

**Stage 4: players make gates**

- [ ] The migration: functions that save, change and delete a player's own
      puzzles and gates, with every refusal in the decisions.
- [ ] The Pixelator opens to every player and saves through them.
- [ ] A player's own gates: name, order, publish and delete.
- [ ] Manage lists every player's gates for the owner, to hide or delete.

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
