---
type: reference
---

# Pixels profiles, friends, mana and rifts of your own

What a player has besides the puzzles, and the rule for who is sent a rift.
`../README.md` says what each page draws.

## A profile

- **A profile is a player:** a row with a username nobody else has. A guest's
  and an account's are the same kind.
- **Making one is typing a username and a PIN of four digits,** at the door,
  which the plain address shows anyone.
- **A player draws their own picture,** 15 squares a side, in the Pixelator
  at `make.html?me`. It is no puzzle, so it needs no single answer.
- **Until it is drawn, the picture is made from the username,** by `face` in
  `app.js`, the same in every browser.
- **Me** shows the picture, the username, the sprites found and the mana,
  changes the first two, and lists the player's own rifts.
- **A player's character is kept as their gear,** which `pixels_me` sends
  and `pixels_set_gear` takes whole: one ink for the skin, one for the
  eyes, and for a piece of armour the player's drawing of it, 225
  characters, an ink where the piece has a square and a dot where it has
  none. Anything else is refused. The owner alone has a character while
  it is a placeholder.

## The door, and coming back

- **The door is one form and one call:** a name, a PIN and Play. `entering`
  in `data.js` draws it for a browser the database knows no player for, and
  `pixels_door` answers it.
- **A new name makes a player with that PIN,** so no player starts without
  one.
- **A name already playing is let in by its PIN:** on another phone, or on
  the same one once its browser has lost the key. The browser is given a key
  of its own, so no phone logs another out, and a player keeps the ten
  newest.
- **A PIN people pick most is refused,** at the door and on Me: a pair said
  twice, such as 1212 or 1111, and a run up or down, such as 1234 or 9876.
- **A guest changes or removes the PIN on Me.** One with no PIN has only
  their browser's key. An account, which has the site's log-in, has none.
- **Five wrong PINs lock that username's way back for 15 minutes, and twice
  as long each time after,** because four digits are few enough to guess.
  Phones already in keep playing.
- **The PIN is kept as a hash salted with the player's id,** which hides it
  from a glance and not from someone holding the table, so only the owner
  reads the table.
- **A home screen icon still carries the key its page had,** as
  `home-screen.md` says.

## The door's brakes

- **The whole door makes 30 new players an hour,** then says it is full for
  the moment. A player coming back is still let in.
- **One address makes 10 players a day and misses 20 times an hour,** a miss
  being a taken name or a wrong PIN.
- **The address is Cloudflare's `cf-connecting-ip`,** which a caller cannot
  set: a request that sends one is refused before it reaches the database.
- **`pixels_door_log` keeps a hash of the address, salted, for a day,** and
  never the address.
- **A guest with nothing found, nothing drawn and no friend 30 days after
  joining is deleted,** by `pixels_prune`, which runs each night and empties
  the log past a day.
- **The owner can close the door to anyone new,** on Players.

## Friends

- **A player sees another only as a friend.** Friends lists a player's
  friends, the ranking holds them and the player, and a maker is told which
  friends found their sprites. The database sends nobody else.
- **Every player has a friend link of their own,** `?join=` and their code,
  on Friends with Share and Copy. New link makes a new code, which closes
  the old one.
- **A friend link asks before it adds.** Whoever opens it is shown the
  sharer's username and picture with Add friend and Not now: a player
  already in at once, and someone new after the door.
- **Add makes the two friends both ways, and Remove ends it both ways.**
- **Nobody is added from a list or by a typed name.**

## Leaving

- **Delete my player, on Me, is a guest's.** It asks twice, then the player
  and all that is theirs are gone: results, friendships, keys, rifts and
  puzzles. Everything the browser kept for Pixels goes too, a drawing not
  yet saved among it, but the Sound switch, and the door is what is left.

## Who is sent a rift

- **`pixels_sees` in the database is the one rule,** and every function that
  sends a puzzle or keeps a time asks it.
- **A hidden rift is sent to nobody.** A player's rift is hidden until they
  publish it.
- **A rift has an audience:** `everyone`, which is one of the owner's as it
  starts; `friends`, which is a player's own, sent to its maker and to
  their friends; or `picked`, which is one of the owner's kept for
  the players ticked in Manage.
- **A rift is its maker's and a number,** and holds boards of any size. No
  maker is the owner's, so a player's first rift and the owner's can both be
  number one.

## Mana and rifts of your own

- **Every player has the Pixelator,** for their own picture, puzzles and
  rifts only.
- **Finding a sprite in somebody else's puzzle gives one mana, and keeping a
  puzzle of your own costs one.** A player starts with nine.
- **Mana is counted by the database from what is there,** so deleting a
  puzzle gives its mana back, and solving your own gives none.
- **The owner has rifts of their own too,** made from Me and sent to their
  friends as any player's are. They cost the owner no mana and are not held
  to five, so Me shows the owner no mana. The rifts every player is sent are
  made from Manage.
- **A player has at most five rifts.** A rift holds 15 puzzles and is
  published with 3 or more. One left with no puzzle is gone.
- **A player writes through database functions, never a table,** which
  refuse a wrong size, wrong squares, a long name, too little mana, a full
  rift or a sixth rift.
- **Only the browser checks that a puzzle has one answer,** because the
  database cannot run the solver. On Players the owner hides or deletes any
  player's rift, and clears any picture.

## Fairies

- **A fairy is a hint that adds no time and finishes the line.** Hint picks
  the line where the numbers decide the most, and a fairy fills and crosses
  out every square of it as the picture has it. Where there is a wrong X,
  the line is that X's row. Undo takes her squares back, and the fairy
  stays spent.
- **With none left a hint lights the line and adds 30 seconds.**
- **A new player has three, and clearing a rift of the course gives three:**
  one of the owner's rifts that everyone is sent, with every puzzle of it
  that is on found. A player's own rift and a friend's give none, because
  three puzzles make a rift and two players could trade them for ever.
- **The database counts them from what is there, as it counts mana.**
  `pixels_fairies` is three, three for each such rift, less
  `pixels_players.fairies_used`, and never under none, so a rift that gains
  a puzzle gives its three again once that one is found.
- **`pixels_use_fairy` takes one and says how many are left.** The page
  asks it before it fills the line, and with no answer the hint costs its
  time.
- **Me and the Hint key say how many a player has,** and the finish says
  `+3 fairies` on a rift just cleared. The fairy is drawn in pixels by
  `app.js`.

## The payoff

- **A maker sees who has found sprites in each of their rifts,** on Me: each
  player's picture, username, how many, and their time.
- **A rift a player has not opened, with nothing found in it, says New.** It
  is kept in their browser under `pixels-seen`.
- **A player's rifts come after the owner's** on the front page, each tile
  saying who made it.
