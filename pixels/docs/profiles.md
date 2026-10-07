---
type: reference
---

# Pixels profiles, friends, mana and gates of your own

What a player has besides the puzzles, and the rule for who is sent a gate.
`../README.md` says what each page draws.

## A profile

- **A profile is a player:** a row with a username nobody else has. A guest's
  and an account's are the same kind.
- **Making one is typing a username,** on the form a guest meets, reached by
  a player's invite link.
- **A player draws their own picture,** 15 squares a side, in the Pixelator
  at `make.html?me`. It is no puzzle, so it needs no single answer.
- **Until it is drawn, the picture is made from the username,** by `face` in
  `app.js`, the same in every browser.
- **Me** shows the picture, the username, the sprites found and the mana,
  changes the first two, and lists the player's own gates.

## Friends

- **Every player has an invite link of their own,** `?join=` and their code,
  and that is the only way in. New link on Friends makes a new code, which
  closes the old link.
- **Whoever joins by a player's link is their friend, both ways, at once.**
- **Friends lists every other player,** friends first, each with Add or
  Remove. Adding is one-way and needs no answer.
- **The owner can close joining for everyone,** on Players, and removing a
  player ends their link.

## Who is sent a gate

- **`pixels_sees` in the database is the one rule,** and every function that
  sends a puzzle or keeps a time asks it.
- **A hidden gate is sent to nobody.** A player's gate is hidden until they
  publish it.
- **A gate has an audience:** `everyone`, which is one of the owner's as it
  starts; `friends`, which is a player's own, sent to its maker and to
  whoever has added them; or `picked`, which is one of the owner's kept for
  the players ticked in Manage.
- **A gate is its maker's, a size and a number.** No maker is the owner's, so
  a player's first gate and the owner's can both be number one.

## Mana and gates of your own

- **Every player has the Pixelator,** for their own picture, puzzles and
  gates only.
- **Finding a sprite in somebody else's puzzle gives one mana, and keeping a
  puzzle of your own costs one.** A player starts with nine.
- **Mana is counted by the database from what is there,** so deleting a
  puzzle gives its mana back, and solving your own gives none.
- **A player has at most five gates.** A gate holds 9 puzzles and is
  published with 3 or more. One left with no puzzle is gone.
- **A player writes through database functions, never a table,** which
  refuse a wrong size, wrong squares, a long name, too little mana, a full
  gate or a sixth gate.
- **Only the browser checks that a puzzle has one answer,** because the
  database cannot run the solver. On Players the owner hides or deletes any
  player's gate, and clears any picture.

## The payoff

- **A maker sees who has found sprites in each of their gates,** on Me: each
  player's picture, username, how many, and their time.
- **A gate a player has not opened, with nothing found in it, says New.** It
  is kept in their browser under `pixels-seen`.
- **A player's gates come after the owner's** on the front page, each tile
  saying who made it.
