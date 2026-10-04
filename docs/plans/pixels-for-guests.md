---
type: plan
---

# Plan: Pixels for guests, with a leaderboard

## Goal

Anyone rux gives the link to plays Pixels with no account: they type a name
once, their results are kept, and a leaderboard shows how everyone is doing.
rux has a page that lists who has played, what each has solved, and whether
they have done today's puzzle.

## Decisions

- **A guest is a name and a key, not an account.** The first visit asks for a
  name and makes a long random key in that browser. The key goes with every
  save and the database keeps only its hash. There is no email and no
  password, so there is nothing to forget and nothing worth stealing.
- **A guest never reads or writes a table.** `docs/database-access.md` keeps
  every table closed to the publishable key, so a guest's page calls database
  functions that check the key first, the way the scheduler's share pages do.
- **A game in progress stays in the browser,** as now. What is saved is a
  finished puzzle: its time and stars, and for the puzzle of the day, the day.
- **Times are taken on trust.** The game runs in the player's browser, so
  someone determined can send a time they did not earn. The database refuses
  what cannot be true, a puzzle that does not exist, a day that is not today,
  a time under a few seconds, and that is all it can do.
- **Making and editing stay the owner's,** behind the log-in.
- **The owner's page is behind the log-in too.** It reads the same tables
  through the owner's rule, and can remove a player.

## Questions

- **Who may join?** Recommended: anyone whose link carries the current
  invite word, such as `/pixels/?join=tulip`. rux changes the word on his
  page, and the old link then lets nobody new in while everyone already in
  keeps playing. The other way is fully open, which a script could fill with
  thousands of made-up players.
- **What does a guest get?** Recommended: everything, the puzzle of the day
  and every level. The other way is the puzzle of the day only.
- **What does the leaderboard rank?** Recommended: two boards. Today's puzzle,
  by stars and then time. And all time, by total stars, with puzzles solved
  and days in a row beside each name.
- **Is rux on the board?** Recommended: yes. His account becomes a player
  under his display name, and his two results come with him.
- **Must a name be the only one of its kind?** Recommended: yes, whatever its
  capitals, so the board never shows two of the same name. One to twenty
  characters.
- **What if a guest changes phone or clears the browser?** Recommended: at
  first they start again under a new name. A code to carry a player to another
  device can follow if anyone asks for it.

## Tasks

- [ ] Write the database part and try it in PGlite before it goes near
      production: a players table, each player's results and days, the
      invite word, and the functions a guest's page calls to join, read its
      own results, save a result, save a day and read the boards.
- [ ] Move rux's account and its results onto a player, so one board holds
      everyone.
- [ ] Let `funnel.js` open Pixels' list and puzzle pages with no log-in, and
      keep the maker and the owner's page behind it; update the check that
      counts locked pages, and `docs/database-access.md` with the functions
      the publishable key may call.
- [ ] A third store in `data.js` beside the account's and the local
      preview's: the guest's, which calls those functions.
- [ ] The name screen, shown once, and the name in the menu after.
- [ ] The boards: today's on the front page under Today, and a page for
      both.
- [ ] The owner's page: every player with when they last played, puzzles
      solved, stars, days in a row and today's puzzle, a player's own list
      on a click, the invite word, and Remove.
