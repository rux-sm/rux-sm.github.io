---
type: plan
---

# Plan: Sevens, an online card game by the rules of Flip 7

## Goal

A new app, Sevens, at `/sevens/`, with a tile on Home. Signed-in people play
Flip 7 together from their own phones: one starts a table, the others join,
and every flip shows on everyone's screen as it happens. It plays by the full
rules of the box and replaces the Flip 7 panel in rux-ui, which is then
retired with its tables.

## Decisions

- **The name is Sevens, not Flip 7,** because Flip 7 is its publisher's
  trademark and this site is public. Header "Rux Sevens", prefix `sevens-`,
  commit scope `sevens`.
- **The full rules of the box.** 94 cards: numbers 0 to 12, as many of each
  as its value and one 0; five bonus cards, +2 to +10, and one ×2; three each
  of Freeze, Flip Three and Second Chance. Each player in turn flips or stays.
  A repeated number busts the round to 0 unless a Second Chance is spent.
  Seven different numbers ends the round with 15 extra. A round scores its
  numbers, doubled by ×2, then adds the bonus cards. First to 200 wins, and
  the highest score wins a tie. Discards are shuffled back only when the deck
  runs out, and the dealer moves one seat each round.
- **Action cards are resolved as the box says.** Freeze and Flip Three go to
  any player still in the round, the drawer included, and the drawer picks
  who from a list. A second Second Chance goes to a player without one, or is
  discarded. During Flip Three, a Second Chance is kept at once and any other
  action waits until the three cards are done.
- **Every player signs in, and a seat is an account.** The name shown is the
  account's own name.
- **The database decides every move.** The deck's order sits in a table no
  page can read, and each move is a function that checks it is that
  account's turn. The old game let any page act for any player.
- **Only accounts with Sevens ticked can play.** The database checks the
  ticked app itself, not only that the account is staff, so a friend given
  Sevens alone can play and reads nothing else.
- **Live by Supabase's realtime channel, private,** as the scheduler's is,
  with a fresh read when a phone wakes.
- **Phone first.** Your own cards large at the bottom with Flip and Stay
  under your thumb, the other players as compact rows with their cards and
  scores, the deck and whose turn it is in the middle.
- **The look is chosen from a specimen** before the game is built, as Pixels'
  was.

## Questions

- Who will you play with, and do they have log-ins yet? Each player needs an
  account, made in the Supabase dashboard, with Sevens ticked on the Access
  page.
- One shared table like the old game, or anyone can start a table and the
  others join it from a list?
- Should a slow turn time out, or should the host be able to skip a player
  who left?
- Keep the old game's chat, or leave it out since you are usually talking
  anyway?

## Tasks

- [ ] rux picks a look from a specimen of the table, the cards and the
      player rows, on the phone.
- [ ] rux reads and approves the database change: the tables, the access
      check and every move as a function, tested with rounds played in SQL
      and rolled back.
- [ ] rux starts a table on the Mac, a second account joins from the phone,
      and they play a round to the end with a Freeze, a Flip Three and a
      Second Chance in it.
- [ ] rux sees a Sevens tile on Home, and a game to 200 names its winner.
- [ ] rux says yes, and the Flip 7 panel leaves rux-ui with its `game_*`
      tables and `*flip_seven*` functions.
