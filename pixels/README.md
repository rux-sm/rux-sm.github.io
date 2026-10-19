# Pixels

Nonogram puzzles, and the Pixelator to draw your own — one app on [design](../design/), served at **rux-sm.github.io/pixels/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md` lists what is unfinished here.

## What it is

A player is an account that can open Pixels, or a guest: anyone with no account who opens the plain
address, `/pixels/`, and types a name and a PIN at the door. A guest's browser keeps a key that is who
they are; one with no key is let in by the name and the PIN. No player is shown another but a friend.
Pixels goes on a phone's home screen as an app, as `docs/home-screen.md` says.

`index.html` has the Pixels star and name at its top, and two tabs. Puzzles: today's puzzle on a card
with the days solved in a row; then Continue, a card that plays the next puzzle; then a tile for each
rift, which the code calls a category, in the owner's order. A tile is the way into its rift: the sprite
last found in it, its number, its name, how many of its sprites are found and a bar of that; once all
are, its boss in a gold frame and the bar gold. A rift of the course from the sixth on is locked until
enough sprites are found, which `app.js`'s `locks` counts: its tile is one dim line saying how many more
open it, and its page shows no puzzle. With `WORLD` in `app.js` on, the owner is drawn the course as a
map in place of its tiles, their character by their rift (`docs/drawing-the-art.md`). Leaderboard:
today's ranking by time, and all time's by puzzles solved.

`category.html?at=` is one rift, named by its place among its maker's: its puzzles, small boards first
and then easy to hard, in rows of five, A to O, each a square showing its picture once found and else
its letter; the next to play is in the primary button's colours and the boss, the last, ringed red until
found. A course rift holds its boss back, dim, until the rest are found. The square chosen is told under
them, with its best time and Play, and a sprite just found turns into view.

`me.html` is the player's own page: their picture, username, sprites found, mana and fairies, the PIN
that brings them back on any phone, and the rifts they have made, each to name, publish or delete, with
who has found sprites in it, and a guest's Delete my player. `friends.html` is the player's friend link
on a card and their friends, each with a menu to remove them. A player's own puzzles are made in the
Pixelator, for mana, and a friend's published rifts stand after the owner's on the front page, saying who
made them, and New until opened. Every page is one phone-wide column on every screen, in Design's
`pixel-dark`, locked. The places, Puzzles, Friends, Pixelator and Me, are the header's links from 66rem,
with the owner's Manage and Players, and a bar along the foot below that, each with its word, but for a
puzzle being played or drawn. Me's list holds How to play, the Sound switch, Add to home screen, the
owner's Manage and Players and, for an account, the way to Rux Home. `docs/profiles.md` has the door,
profiles, friends, mana and who gets a rift.

`play.html?id=` plays one puzzle, 5, 10, 15 or 20 squares a side. The board waits bare behind Tap to
start, or Start with a mouse, and the clock runs from that tap. Fill a square or cross it out with X, by
tap, by dragging along a row or column, with a mouse's right button, which always crosses out, or with
the arrow keys, Z and X. On a phone a board of 15 or 20 zooms under two fingers, its numbers staying in
view, and there a touch fills as it lifts and a resting finger lights its row and column. A drag along a
line counts its squares. A number greys out when its run of squares is filled, a line with no square of
the picture starts crossed out, and a finished line crosses out its own empty squares and strikes the
enemy. Filling a square not in the picture is a mistake, crossed out in red, and costs one of five
hearts, drawn over the board with the clock at their row's end; with none left a fairy brings them back
or the puzzle starts again. The clock is the score: a hint adds 30 seconds, or spends a fairy and adds
none, and the best time is the one kept. With `WORLD` on, the owner's two tool keys are one switch, a
sword and a shield, the enemy's health, a bar of the picture left to fill, stands before the clock, and a
character faces the enemy's shadow, with a helmet and a heart more at five sprites. Hint, or H, lights
the line where the numbers decide the most, and a fairy finishes it, as `docs/profiles.md` says. Undo, or
U, takes back the last tap or drag, and Redo, or R, puts it back, but neither touches a mistake, and a
tap that was only a mistake is no move to take back. Pause, P or Escape, or leaving the page stands the
clock under a cover with Resume, Restart and Exit, which goes where the player came from; Restart empties
the board, and Undo straight after brings it back. A tile fills the board's corner: the picture so far,
on a faint line round it and after every fifth square. When the picture is complete the squares fill in
as the picture, in its colours if it has them, and its name shows with the time, the mistakes and the
hints. Under them the rift's tile counts the sprite, says +1 mana where the find earned one and +3
fairies where it cleared the rift, and opens the rift; a rift the sprite opened stands under it, saying
Opened. Next goes to that rift's next unsolved puzzle, then to the next open rift. How to play is three
steps in a modal, each with a small board: the numbers, filling and crossing out, and what a mistake
costs. It opens from Me's list, the button under Start, and by itself for a player who has solved none
and has not closed it in this browser. The clock stands meanwhile. Each move plays a tone, which Me's
Sound switch turns off and an iPhone's silent switch does not, and a phone ticks on each fill. A game in
progress is kept in the browser for a reload.

The leaderboard is switched off by `BOARD` in `app.js`: the front page has no tabs and no ranking, and
results are saved as ever. The puzzle of the day is switched off by `DAILY` in `app.js`: no page shows
it, the leaderboard ranks all time only, and the maker still dates puzzles so they can be drawn ahead.
With it on, `play.html?daily` plays the puzzle of the day: the one the owner drew for that day, with its
name and colours, or where there is none, one the browser makes from the date, the same for everyone.
Only it counts toward the days in a row. A player is never sent a day's puzzle before its day.

`make.html` draws a picture that becomes a puzzle, and `make.html?id=` edits or deletes one. The owner's
puzzles go in the owner's rifts, and the owner alone has Manage and Players, in the header and Me's list;
a player's go in rifts of their own, through functions that count their mana, and so do the owner's own
at `make.html?own`, which cost none. `make.html?me` draws a player's picture, and `?wear=helmet` the
helmet of the owner's character. It checks as you draw whether the numbers alone can solve the picture
and how hard that is, outlines each square that would need a guess, and saves only a picture with one
answer. Size starts a blank board of 5, 10 or 15 a side, 20 in the course. Its Colour step paints the
picture the puzzle finishes as, from sixty inks, and Save asks which rift it goes in; a rift shows
fifteen, the list counts how many of each one's are on, and a puzzle saved into one with fifteen on is
saved off. A rift just started is named there and hidden until Manage's switch publishes it. No rift yet
keeps the puzzle in Unsorted, a section of Manage, and Puzzle of the day makes it a day's puzzle, in no
rift; a day takes one. `docs/making-puzzles.md` is the guide to a good picture and a good rift.

`manage.html` is the owner's desk: a row to each rift, then Unsorted and Dailies, with a strip of its
pictures and a rift's Published switch. A tap opens one under its row and a second tap closes it;
`?rift=3` keeps it on a reload. An open rift has arrows that move it, a key that keeps it for picked
players, a pencil that renames it and a bin that deletes it into Unsorted. Under each tile are Edit,
Play, which keeps no time for a puzzle no player is sent, and a switch that sends it to no player when
off; a rift has at most fifteen on. Add puzzle, after a rift's tiles, opens the Pixelator for it.
Pressing a tile ticks it, and the ticked are moved, to a rift, a new one or Unsorted, or deleted; a rift
left empty goes too.

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
account or the hash of the guest's key, and how many fairies they have used; `pixels_player_results` and
`pixels_player_days`, each player's best time on a puzzle and on a puzzle of the day; `pixels_settings`,
whether new players may join; `pixels_friends`, who is whose friend; `pixels_player_keys`, the key of
each phone that came back by a PIN; `pixels_level_players`, the players a rift is kept for;
`pixels_levels`, each rift's id, name, maker, audience and whether it is hidden; and `pixels_door_log`, a
day of hashed callers for the door's brakes, which no account reads. A rift and a puzzle with no maker
are the owner's. `docs/database-access.md` is the rule they follow.

A player's page calls twenty-five functions, which the publishable key may run and which first find the
player from the log-in or the key; `data.js`'s header names them. A time is the player's own browser's
word: the database refuses only what cannot be, a time under two seconds, a puzzle the player is not
sent, a day more than one from today. `pixels_puzzles` sends a player no puzzle that is switched off,
which is `pixels_puzzles.hidden`, none in no rift, which is one whose `level` is empty, and none in a
rift that `pixels_sees` says is not theirs to see: that one function is the rule, a hidden rift for
nobody and a rift for everyone, for its maker's friends or for the players picked, as its audience says.

Five more are the owner's and refuse anyone else. `pixels_share_level` keeps a rift for the players
named, or gives it back to everyone. `pixels_order_levels` renumbers the owner's rifts in one step, so a
move cannot stop half done, and each rift keeps its id. `pixels_delete_level` deletes a rift the same
way: its puzzles are left in no rift and the rifts after it move up. `pixels_name_level` and
`pixels_hide_level` name and hide a rift, and make its row if it has none.

`players.html` is the owner's: joining's line and its key, which shuts the door to anyone new; a row a
player, their picture, name and stats, whose Edit renames them, clears their picture or removes them and
their results from the leaderboard; and the rifts players have made, each to hide or delete.

The local preview, `npm run serve` on :8640, has no log-in, so there Pixels
keeps its puzzles and times in the browser instead, starting from the nine in
`data.js`. The cloud preview on :8641 uses the database.

## Check

    npm run check        from the repository root
