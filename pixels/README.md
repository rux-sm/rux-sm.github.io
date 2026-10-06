# Pixels

Picture logic puzzles, and a maker to draw your own — one app on [design](../design/), served at **rux-sm.github.io/pixels/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md`
lists what is unfinished here.

## What it is

A player is an account that can open Pixels, or a guest: someone with no
account who opens an invite link, `/pixels/?join=` and the invite word, and
types a name. A guest gets no header, and their browser keeps a key that is
who they are from then on.

`index.html` has two tabs. Puzzles: today's puzzle on one card with the days
solved in a row, then every puzzle by the category its maker gave it, easy to
hard, with nothing locked, each tile a square, three across on a phone and
nine on a wide screen, so a category of nine fills its rows. A category is
headed by its name, such as Fruit, and one with no name by More. The 5×5 ones
say Quick first and come first, the 15×15 ones say Long and come last. The
owner has a switch beside each name that hides the category from every other
player, and arrows that move it up or down. Under each tile the owner has a
switch that sends that puzzle to no player when off; a category has at most
nine on. Player view, a switch at the top of the owner's page, draws the page
as a player is sent it, with nothing of the owner's. A solved
puzzle shows its picture, name and best time; an unsolved one a question mark and
how hard it is, and its name stays hidden until it is solved. Leaderboard:
today's ranking with each player's time, and the all-time one with puzzles
solved.

`play.html?id=` plays one puzzle, 5, 10 or 15 squares a side. The board
waits behind Tap to start, which with a mouse says Start, drawn bare until
then, with no number and no mark, and the clock runs from that tap. Fill a square
or cross it out with X, by tap, by dragging along a row or column, with a
mouse's right button, which always crosses out, or with
the arrow keys, Z and X. On a phone a 15×15 board zooms under two fingers,
its numbers staying in view, and there a touch fills as it lifts.
A number greys out when its run of squares is filled, a line with no square
of the picture starts crossed out, and a finished line
crosses out its own empty squares. The clock is the score, as in Picross:
filling a square not in the picture is a mistake, crossed out in red, and it
adds time, 15 seconds for a puzzle's first, 30 for its second and a minute
for each one after; a hint adds 30 seconds. The clock is red until the next
move, and the best time on a puzzle is the one kept.
Hint, or H, lights the line where the numbers decide the most. Undo, or U, takes back the last tap or
drag, and Redo, or R, puts it back, but neither touches a mistake, and a
tap that was only a mistake is no move to take back. Restart
empties the board, and Undo straight after brings it back. Every board has
one footprint, whatever its puzzle's size: the squares together are as wide
as the window's width and height allow, to 600px, and always a multiple of
30px, so a square is whole pixels on a board of five, ten or fifteen. The
corner is a square of one size, 84px on a phone and 120px on a wide screen,
and a tile fills it: the puzzle's name, the picture so far, drawn small, and
the clock. The keys under the board end where it does. A warm line rules off
every fifth square. Every other line's numbers sit on a band that runs out
from its squares and fades, larger on larger squares, and a line with more
numbers than its room holds draws them smaller to fit.
When the picture is complete the squares
fill in as the picture, in its colours if it has them, and its name shows
with the time, the mistakes and hints, and what they added.
How to play is three steps in a modal, each with a small board: what the
numbers mean, filling and crossing out, and what a mistake costs. It opens from the
menu on every page and from the button under Start, and by itself on the
first puzzle of a player who has solved none and has not closed it in this
browser. A guest has no menu, so the front page has a button for it under
their puzzles. The clock stands while it is open.
Each move plays a tone, which the Sound key turns off and an iPhone's
silent switch does not, and a phone ticks
on each fill where the browser allows it. A game in
progress is kept in the browser, so a reload picks it up.

The leaderboard is switched off by `BOARD` in `app.js`: the front page has
no tabs and no ranking, and results are saved as ever. The puzzle of the day is switched off by `DAILY` in `app.js`: no page shows
it, the leaderboard ranks all time only, and the maker still dates puzzles so
they can be drawn ahead. With it on, `play.html?daily` plays the puzzle of the day: the one the owner drew for
that day, with its name and colours, or where there is none, one the browser
makes from the date, the same for everyone. Only it counts toward the days
in a row. A player is never sent a day's puzzle before its day.

`make.html` draws a picture that becomes a puzzle, and `make.html?id=` edits
or deletes one. Only the owner's account makes and edits: it alone sees Make
in the menu and an Edit link under each tile, and the database refuses a
puzzle written by anyone else. It checks as you draw whether the numbers alone can solve the
picture and how hard that is, outlines each square that would need a guess,
and saves only a picture with one answer. Size starts a blank board of 5,
10 or 15 a side. Its Colour step paints the picture
the puzzle finishes as, from fifty-five inks, and Save asks which category it goes in on the front
page; a category shows nine, the
list counts how many of each one's are on, and a puzzle saved into one with nine on is saved off. A category just started is
named there and hidden until the front page's switch publishes it. Puzzle of the day, in the same list, makes it a
day's puzzle, which sits in no category; a day takes one. `docs/making-puzzles.md` is the guide to a good picture and a good
category.

## Files

| | |
| :--- | :--- |
| `app.js` | the rules and the board every page shares: the numbers, the line solver, the puzzle of the day, drawing, dragging and zooming, what a mistake costs, tones and the phone's tick |
| `data.js` | who is playing, the name form a guest meets, and where puzzles and results are kept |
| `puzzles.js`, `play.js`, `make.js`, `players.js` | each page's own behaviour |
| `app.css` | the board, the picture and the puzzle list, under `pixels-` |
| `theme.css` | the eight inks a colour picture is painted from |

## Data

Six tables in the site's database, which only the owner's account reads
directly: `pixels_puzzles`, every puzzle, which a staff account may read too;
`pixels_players`, each player's name with the account or the hash of the
guest's key; `pixels_player_results` and `pixels_player_days`, each player's
best time on a puzzle and on a puzzle of the day, with a number of stars no page shows; and
`pixels_settings`, the invite word; and `pixels_levels`, each category's name and whether it is hidden. `docs/database-access.md` is the rule
they follow.

A player's page calls eight functions, which the publishable key may run and
which first find the player from the log-in or the key: `pixels_join`,
`pixels_me`, `pixels_puzzles`, `pixels_results`, `pixels_days`,
`pixels_record`, `pixels_record_day` and `pixels_board`. A time is the
player's own browser's word: the database refuses only what cannot be, a
time under two seconds, a puzzle that does not exist, a day more than one
from today. `pixels_puzzles` sends a player no hidden category and no puzzle that is
switched off, which is `pixels_puzzles.hidden`.

A ninth, `pixels_order_levels`, is the owner's and refuses anyone else: it
renumbers the categories of one size in one step, so a move cannot stop
half done.

`players.html` is the owner's: every player with today's puzzle, days in a
row, puzzles solved and when they last played; the name, which can be
typed over; the invite word, whose change closes the old link to anyone new;
and Remove, which takes a player and their results off the leaderboard.

The local preview, `npm run serve` on :8640, has no log-in, so there Pixels
keeps its puzzles and times in the browser instead, starting from the nine in
`data.js`. The cloud preview on :8641 uses the database.

## Check

    npm run check        from the repository root
