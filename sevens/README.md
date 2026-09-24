# Sevens

An online card game by the rules of Flip 7, played from each player's own
phone — one app on [design](../design/), served at
**rux-sm.github.io/sevens/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md`
lists what is unfinished here.

## What it is

`index.html` lists your games and the tables waiting for players. Anyone
signed in with Sevens can start a table or join one, and whoever started it
deals when two or more are seated.

`table.html?id=` is one game: every player's cards, the deck, the last move,
and Flip and Stay on your turn. An action card you draw asks who gets it.
Between rounds it shows the scores and Deal for the next; at 200 it names the
winner. Whoever started the table can skip a player who has gone quiet, and
a player can leave, which takes them out for the rest of the game. The chat
is under every view.

## The rules

94 cards: one 0 and as many of each number 1 to 12 as its value; +2 to +10
and ×2; three each of Freeze, Flip Three and Second Chance. A repeated number
busts the round to 0 unless a Second Chance is spent. Seven different numbers
end the round with 15 more. A round scores its numbers, doubled by ×2, then
the bonus cards. First to 200 wins; a tie at the top plays another round.

## How it works

The database runs the game. Five tables — `sevens_tables`, `sevens_seats`,
`sevens_cards`, `sevens_moves`, `sevens_messages` — hold each game, and
every move is a database function that checks it is the caller's to make.
Row security shows a player every card in front of anyone and none in the
deck, and only players read a game or its chat. `docs/database-access.md` is
the rule they follow.

| | |
| :--- | :--- |
| `data.js` | the reads, the moves and the live updates |
| `app.js` | a card, a hand's score, a move as a sentence |
| `tables.js`, `table.js` | each page's own behaviour |
| `theme.css` | each card's solid colour, from the real deck |
| `app.css` | the cards, hands, players and chat, under `sevens-` |

The local preview on :8640 has no log-in and shows a notice; play on the
cloud preview on :8641 or the published site.

## Check

    npm run check        from the repository root
