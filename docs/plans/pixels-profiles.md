---
type: plan
---

# Plan: Pixels on a second phone

## Goal

A player who wants Pixels on a second phone sets a PIN and logs in there
with it. Everything before this is built, and `pixels/docs/profiles.md` says
what it is.

## Decisions

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

- **Putting a player's gates in an order of their choosing,** a friend
  request that waits for an answer, comments, likes, reports, and spending
  mana on anything but puzzles.

## Questions

## Tasks

- [ ] The migration: a key for each phone, the PIN kept as a hash, and the
      count of wrong tries with its lock.
- [ ] Me sets and changes a PIN, and the form a visitor meets offers Log in
      with a username and a PIN.
- [ ] `pixels/README.md`, `pixels/docs/profiles.md` and
      `docs/database-access.md` say what is true, and it is run in Chrome on
      :8641 and in the iPhone simulator.
