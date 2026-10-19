# Pixels

Nonogram puzzles, and the Pixelator to draw your own — one app on [design](../design/), served at **rux-sm.github.io/pixels/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md` lists what is unfinished here.

## What it is

A player is an account that can open Pixels, or a guest: anyone with no account who opens the plain
address, `/pixels/`, and types a name and a PIN at the door. A guest's browser keeps a key that is who
they are; one with no key is let in by the name and the PIN. No player is shown another but a friend.
Pixels goes on a phone's home screen as an app, as `docs/home-screen.md` says.

`index.html` has two tabs. Puzzles: today's puzzle on a card with the days solved in a row; then a tile
for each rift, which the code calls a category, in the owner's order, one to a row on a phone. A tile
is its rift's portal, in pixels, coloured by its rank, E to S, and shut in grey once every sprite is
found; then its rank and name, such as E · The Undergrowth, or More where it has none; its number and
how many sprites are found; and a bar of that. A rift of the course from the sixth on is locked until
enough sprites are found, which `app.js`'s `locks` counts: its tile is dim and no link, its page shows
no puzzle, and both say how many of those sprites are found. The owner is drawn the course as a map in
place of its tiles, their character by their rift (`docs/drawing-the-art.md`). Continue opens the next
puzzle to play. Leaderboard: today's ranking by time, and the all-time one by puzzles solved.

`category.html?at=` is one rift, named by its place among its maker's: its puzzles, small boards first
and then easy to hard, each tile a square with its letter in the rift, A to O, three across on a phone,
five on a wide one. A solved puzzle shows its picture, name and best time, an unsolved one a question
mark over its size, with Boss for the last, and the first, the one to play next, has its mark in the
primary button's colours. A course rift holds its boss back, dim, until the rest are found.

`me.html` is the player's own page: their picture, username, sprites found, mana and fairies, the PIN
that brings them back on any phone, and the rifts they have made, each to name, publish or delete, with
who has found sprites in it, and a guest's Delete my player. `friends.html` is the player's friend link
and their friends, each to remove. A player's own puzzles are made in the Pixelator, for mana, and a
friend's published rifts stand after the owner's on the front page, saying who made them, and New until
opened. A bar holds the places every player has, Puzzles, Friends, Pixelator and Me: along the bottom
on a phone, along the top on a wider one, and in a header from 66rem; not where a puzzle is played or
drawn. Me's list holds How to play, Add to home screen and, for an account, the way to Rux Home. Every
page is in Design's `pixel-dark`, locked. `docs/profiles.md` has the door, profiles, friends, mana and who gets a rift.

`play.html?id=` plays one puzzle, 5, 10, 15 or 20 squares a side. The board waits bare behind Tap to
start, or Start with a mouse, and the clock runs from that tap. Fill a square or cross it out with X,
by tap, by dragging along a row or column, with a mouse's right button, which always crosses out, or
with the arrow keys, Z and X. On a phone a board of 15 or 20 zooms under two fingers, its numbers
staying in view, and there a touch fills as it lifts. A number greys out when its run of squares is
filled, a line with no square of the picture starts crossed out, and a finished line crosses out its
own empty squares. Filling a square not in the picture is a mistake, crossed out in red, and costs one
of three hearts, drawn over the board by the enemy's health, a bar of the picture left to fill; with
none left a fairy brings them back or the puzzle starts again. The clock is the score: a hint adds 30
seconds, or spends a fairy and adds none, and the best time is the one kept. For the owner the two tool
keys are one switch, a sword and a shield, and a character faces the enemy's shadow, with a helmet and
a heart more at five sprites. Hint, or H, lights the line where the numbers decide the most, and a
fairy finishes it, as `docs/profiles.md` says. Undo, or U, takes back the last tap or drag, and Redo,
or R, puts it back, but neither touches a mistake, and a tap that was only a mistake is no move to take
back. Restart empties the board, and Undo straight after brings it back. Every board has one footprint,
in whole pixels a square; `app.css` has its measures. A tile fills the board's corner: the puzzle's
name, the picture so far and the clock. A warm line rules off each fifth square. When the picture is
complete the squares fill in as the picture, in its colours if it has them, and its name shows with the
time, the mistakes and the hints. Under them the rift's tile counts the sprite, says +1 mana where the
find earned one and +3 fairies where it cleared the rift, and opens the rift, as Back does; a rift the
sprite opened stands under it, saying Opened. Next goes to that rift's next unsolved puzzle, then to
the next open rift. How to play is three steps in a modal, each with a small board: the numbers,
filling and crossing out, and what a mistake costs. It opens from Me's list, from the button under
Start, and by itself for a player who has solved none and has not closed it in this browser. The clock
stands meanwhile. Each move plays a tone, which the Sound key turns off and an iPhone's silent switch
does not, and a phone ticks on each fill. A game in progress is kept in the browser for a reload.

The leaderboard is switched off by `BOARD` in `app.js`: the front page has no tabs and no ranking,
and results are saved as ever. The puzzle of the day is switched off by `DAILY` in `app.js`: no page
shows it, the leaderboard ranks all time only, and the maker still dates puzzles so they can be
drawn ahead. With it on, `play.html?daily` plays the puzzle of the day: the one the owner drew for
that day, with its name and colours, or where there is none, one the browser makes from the date,
the same for everyone. Only it counts toward the days in a row. A player is never sent a day's
puzzle before its day.

`make.html` draws a picture that becomes a puzzle, and `make.html?id=` edits or deletes one. The
owner's puzzles go in the owner's rifts, and the owner alone has Manage and Players, in Me's list; a
player's go in rifts of their own, through functions that count their mana, and so do the owner's own
at `make.html?own`, which cost none. `make.html?me` draws a player's picture, and `?wear=helmet` the
helmet of the owner's character. It checks as you draw whether the numbers alone can solve the picture
and how hard that is, outlines each square that would need a guess, and saves only a picture with one
answer. Size starts a blank board of 5, 10 or 15 a side, 20 in the course. Its Colour step paints the
picture the puzzle finishes as, from sixty inks, and Save asks which rift it goes in; a rift shows
fifteen, the list counts how many of each one's are on, and a puzzle saved into one with fifteen on is
saved off. A rift just started is named there and hidden until Manage's switch publishes it. No rift
yet keeps the puzzle in Unsorted, a section of Manage, and Puzzle of the day makes it a day's puzzle,
in no rift; a day takes one. `docs/making-puzzles.md` is the guide to a good picture and a good rift.

`manage.html` is the owner's desk: a row to each rift, then Unsorted and Dailies, with a strip of its
pictures and a rift's Published switch. A tap opens one, under its row or, on a wide screen, beside
the list; `?rift=3` keeps it on a reload. An open rift has arrows that move it, a key that keeps it
for picked players, a pencil that renames it and a bin that deletes it into Unsorted. Under each tile are Edit, Play, which keeps no time for a puzzle no player is sent, and a
switch that sends it to no player when off; a rift has at most fifteen on. Add puzzle, after a rift's
tiles, opens the Pixelator for it. Pressing a tile ticks it, and the ticked are moved, to a rift, a
new one or Unsorted, or deleted; a rift left empty goes too.

## Files

| | |
| :--- | :--- |
| `app.js` | the rules and the board every page shares: the numbers, the line solver, the puzzle of the day, drawing, dragging and zooming, what a mistake costs, tones and the phone's tick |
| `data.js` | who is playing, the door a guest meets, and where puzzles and results are kept |
| `puzzles.js`, `category.js`, `play.js`, `make.js`, `manage.js`, `players.js`, `me.js`, `friends.js` | each page's own behaviour |
| `app.css` | the board, the picture, the tiles and Manage, under `pixels-`. The bar of places, the keys, a rift's tile, the start cover and the finish panel are `game-`, from `design/css/rux-game.css` |
| `theme.css` | the sixty inks a colour picture is painted from |
| `manifest.json` | the name, the window and the icons a browser installs Pixels with; `app.js` gives it to every browser but an iPhone's. `tools/build-app-icons.mjs` writes the four PNG icons in `brand/` from `brand/favicon.svg` |

## Data

Ten tables in the site's database, which only the owner's account reads directly: `pixels_puzzles`, every
puzzle, which a staff account may read too; `pixels_players`, each player's name and picture with the
account or the hash of the guest's key, and how many fairies they have used; `pixels_player_results` and `pixels_player_days`, each player's best
time on a puzzle and on a puzzle of the day; `pixels_settings`, whether new players may join;
`pixels_friends`, who is whose friend; `pixels_player_keys`, the key of each phone that came back by a PIN;
`pixels_level_players`, the players a rift is kept for; `pixels_levels`, each rift's id, name, maker,
audience and whether it is hidden; and `pixels_door_log`, a day of hashed callers for the door's brakes,
which no account reads. A rift and a puzzle with no maker are the owner's. `docs/database-access.md` is the
rule they follow.

A player's page calls twenty-five functions, which the publishable key may run and which first find the
player from the log-in or the key: `pixels_door`, `pixels_me`, `pixels_puzzles`, `pixels_results`,
`pixels_days`, `pixels_record`, `pixels_record_day`, `pixels_board`, `pixels_set_picture`,
`pixels_set_gear`, `pixels_rename`, `pixels_set_pin`, `pixels_use_fairy`, `pixels_leave`,
`pixels_people`, `pixels_friend_offer`, `pixels_add_friend`, `pixels_unfriend`, `pixels_renew_invite`,
and for a player's own rifts `pixels_mine`, `pixels_keep_puzzle`, `pixels_drop_puzzle`,
`pixels_name_my_level`, `pixels_publish_my_level` and `pixels_delete_my_level`. A time is the player's
own browser's word: the database refuses only what cannot be, a time under two seconds, a puzzle the
player is not sent, a day more than one from today. `pixels_puzzles` sends a player no puzzle that is
switched off, which is `pixels_puzzles.hidden`, none in no rift, which is one whose `level` is empty,
and none in a rift that `pixels_sees` says is not theirs to see: that one function is the rule, a
hidden rift for nobody and a rift for everyone, for its maker's friends or for the players picked, as
its audience says.

Five more are the owner's and refuse anyone else. `pixels_share_level` keeps a rift for the players
named, or gives it back to everyone. `pixels_order_levels` renumbers the owner's rifts
in one step, so a move cannot stop half done, and each rift keeps its id. `pixels_delete_level`
deletes a rift the same way: its puzzles are left in no rift and the rifts after it move up.
`pixels_name_level` and `pixels_hide_level` name and hide a rift, and make its row if it has none.

`players.html` is the owner's: every player with their picture, today's puzzle, days in a row,
puzzles solved and when they last played; the name, which can be typed over; Close joining, which
shuts the door to anyone new; Clear picture; the rifts players have made, each to hide or
delete; and Remove, which takes a player and their results off the leaderboard.

The local preview, `npm run serve` on :8640, has no log-in, so there Pixels
keeps its puzzles and times in the browser instead, starting from the nine in
`data.js`. The cloud preview on :8641 uses the database.

## Check

    npm run check        from the repository root
