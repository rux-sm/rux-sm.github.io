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
  account's own name. Each player's account is made in the Supabase dashboard
  and given Sevens on the Access page.
- **Five tables.** `sevens_tables` is each game: its host, whether it is
  waiting, playing or finished, the round, the dealer and whose turn it is.
  `sevens_seats` is each player at a table: the account, seat order, total
  score and whether they are in, stayed, busted or frozen this round.
  `sevens_cards` is all 94 cards of a game, one row each: in the deck with its
  place, in a player's hand, or discarded, with who drew it and in which
  round. `sevens_moves` is the history of every flip, stay, action and bust,
  which the table page shows as it happens. `sevens_messages` is each
  table's chat, which only its players read and write.
- **A card in the deck is hidden by the database.** Row security shows a page
  every card in a hand or the discard pile and none in the deck, so the order
  cannot be read; a page sees only how many are left.
- **The database decides every move.** Each move is a function that checks it
  is that account's turn. The old game let any page act for any player.
- **Any player with Sevens sees the open tables and joins one,** and whoever
  started a table deals when everyone is in.
- **Only accounts with Sevens ticked can play.** The database checks the
  ticked app itself, not only that the account is staff, so a friend given
  Sevens alone can play and reads nothing else.
- **Live by Supabase's table changes,** which reach a listener only for rows
  its rules let it read, with a fresh read when a phone wakes.
- **Phone first.** Your own cards large at the bottom with Flip and Stay
  under your thumb, the other players as compact rows with their cards and
  scores, the deck and whose turn it is in the middle.
- **Each card is one solid colour,** the colour its number or name has on the
  real deck, toned to a matte shade, kept in `sevens/theme.css`. rux will
  draw pixel art for the cards later, and it replaces these faces.

## Questions

- None open.

## Tasks

- [ ] rux starts a table on the Mac, a second account joins from the phone,
      and they play a round to the end with a Freeze, a Flip Three and a
      Second Chance in it.
- [ ] rux says yes, and the Flip 7 panel leaves rux-ui with its `game_*`
      tables and `*flip_seven*` functions.
