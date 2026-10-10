---
type: plan
---

# Plan: Pixels, open to the public

## Goal

Anyone who has the plain address, rux-sm.github.io/pixels/, picks a name and
a PIN and plays, with no invite. No player is shown another unless the two
are friends, and they are friends only when one shares their friend link on
purpose and the other presses Add. A script can neither flood the door nor
guess its way into a player, and the scheduler's data stays as locked as it
is.

## Decisions

The door:

- **The plain address is the way in.** The door asks for no code, because a
  shared address and a store app both need a door with no key.
- **The door is one call, `pixels_door`: a name, a PIN and the browser's
  key.** A new name makes a player with that PIN and a name already playing
  is let in by its PIN, so no player lands without one. `pixels_join` and
  `pixels_login` go.
- **A PIN people pick most is refused,** at the door and on Me: four of one
  digit, a run up or down such as 1234 or 9876, and a pair said twice such
  as 1212. Those are the first a stranger would try on a name.
- **Five wrong PINs lock a name's log-in,** as `pixels/docs/profiles.md`
  says, and a phone already in keeps playing.
- **Close joining, on Players, stays the off switch.**

The brakes:

- **The whole door takes 30 new players an hour,** then says to try later, so
  a script's worst is a slow hour and never a full table.
- **One address makes 10 players a day and misses 20 times an hour,** a miss
  being a taken name or a wrong PIN, if the database can trust the caller's
  address. It keeps a salted hash of the address for a day and never the
  address.
- **No bot check at the door.** The brakes bound what a script can do, and
  Cloudflare's check needs an Edge Function in front of the door, which is
  the next step if junk players arrive.
- **A guest with nothing found, nothing drawn and no friend 30 days after
  joining is deleted,** by a nightly job, so a public door does not fill
  with names nobody uses.

Who sees whom:

- **A player sees another only as a friend.** Friends lists friends and
  nobody else, the ranking holds the player and their friends, and a maker
  is told only which friends found their sprites. The database enforces all
  three, because the publishable key can call a function whatever a page
  shows.
- **A friend link asks before it adds.** Whoever opens one sees the sharer's
  username and picture and an Add key: a player already in sees it at once,
  and someone new sees it after the door.
- **Add makes the two friends both ways, and Remove ends it both ways.** The
  sharer asked for it by sending the link, and a removed friend must stop
  being sent the other's gates.
- **Nobody is added by a typed name or from a list.** `pixels_befriend`
  goes, because by a player's id it lets anyone add anyone and be sent
  their gates.
- **A friend link keeps `?join=` and the player's code,** so the links
  already sent still work. New link closes the old one.
- **The address is plain.** `enter` stops putting the code in it, because a
  friend link is shared on purpose: Friends has Copy, and Share where the
  browser has a share sheet.
- **The friendships there are stay.** All eight rows are a pair, each guest
  with the owner, so those guests keep the owner and stop seeing each other.
- **The owner sees every player on Players,** as the one who renames and
  removes them.
- **"That name is taken" still says a name exists.** Usernames are one of a
  kind, and the address brake limits how many a stranger can ask about.
- **No name filter.** Only a friend and the owner read a name. A filter,
  report and block belong to the App Store version, where Apple's rule 1.2
  asks for them.
- **Search engines stay asked to keep out,** by `robots.txt`, so public
  means anyone who has the address.

Leaving, and what is kept:

- **Delete my player, on Me, removes the player and all that is theirs:**
  results, friendships, keys, gates and puzzles. It asks twice and cannot be
  taken back.
- **The door links to What Pixels keeps,** a short page that says what is
  stored about a player and gives an address to write to, since a public
  door takes a name from strangers.

Where it lives:

- **Pixels stays in the site's database.** That database's address and key
  are public already, so the open door adds rows and calls, and both are
  braked.
- **A guest stays a browser key, and Supabase's anonymous sign-in stays
  off.** Switched on, it would make every visitor a logged-in user of the
  database the scheduler lives in.
- **The migration lands in two steps:** the new functions first, the pages
  next, and the old functions dropped last, so the live pages work
  throughout.

## Questions

1. Which email address should What Pixels keeps give players to write to?

## Tasks

- [ ] Find the request header that carries the caller's address into a
      database function, and prove a forged one does not get through.
      Without one, the address brake leaves this plan and the whole-door
      brake stands. The SQL is shown to rux first.
- [ ] Write the first migration and test it offline in PGlite:
      `pixels_door` with the brakes; the refused PINs in it and in
      `pixels_set_pin`; `pixels_people`, `pixels_board` and `pixels_mine`
      holding friends only; the friend link's three functions, which show
      the sharer, add both ways and remove both ways; `pixels_leave`; the
      day's log of hashed addresses; and the nightly job. Each is granted
      to the key by name. The SQL is shown to rux first, and
      `docs/database-access.md`'s check is run after it.
- [ ] Open the door: the plain address joins in one call, with words for a
      refused PIN and for each brake, and the address stays plain.
- [ ] Make the friend link ask: for a player already in, and for someone
      new after the door. Friends lists friends only, each with Remove, and
      has Copy and Share.
- [ ] Add Delete my player to Me.
- [ ] Write What Pixels keeps and link it from the door.
- [ ] Drop `pixels_befriend`, `pixels_join` and `pixels_login` in a second
      migration, shown to rux first.
- [ ] Prove it at the live door: join as two test players, friend them by
      link, see that each is shown only the other and a third is shown
      neither, then remove all three with Delete my player.
