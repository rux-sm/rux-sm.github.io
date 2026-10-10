# Pixels

Nonogram puzzles, and the Pixelator to draw your own — one app on [design](../design/), served at **rux-sm.github.io/pixels/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md` lists what is unfinished here.

## What it is

A player is an account that can open Pixels, or a guest: someone with no account who opens a
player's invite link, `/pixels/?join=` and that player's code, and types a name. A guest gets no
header, and their browser keeps a key that is who they are from then on. Pixels goes on a phone's
home screen as an app; `docs/home-screen.md` says how, and how a guest stays the same player there.

`index.html` is the same page for every account, the owner's too, with two tabs. Puzzles: today's
puzzle on one card with the days solved in a row; Continue, a card for the puzzle last played if it is
unsolved and otherwise the next unsolved after it; then a tile for each gate, which the code calls a
category, in the owner's order. A tile is sixteen squares, four by four: its gate's number, or its
maker's picture, then its fifteen pictures small, each a question mark until solved; then its name,
such as Fruit, or More where it has none; its boards' sizes; and how many sprites are found, or Gate
cleared, with a bar of that. Leaderboard: today's ranking with each player's time, and the all-time
one with puzzles solved.

`category.html?at=` is one gate, named by its place among its maker's: its puzzles, small boards first
and then easy to hard, with nothing locked, each tile a square with its letter in the gate, A to O,
three across on a phone and five on a wide screen. A solved puzzle shows its picture, name and best
time; an unsolved one a question mark, or Boss for the last.

`me.html` is the player's own page: their picture, username, sprites found and mana, a PIN for
logging in on another phone, and the gates they have made, each to name, publish or delete, with who
has found sprites in it. `friends.html` is the player's invite link and every other player, each to
add or remove. A player's own puzzles are made in the Pixelator, for mana, and a friend's published
gates stand after the owner's on the front page, saying who made them, and New until opened. A bar
holds the places every player has, Puzzles, Friends, Pixelator and Me: along the bottom on a phone,
along the top on a wide screen, and not on a page where a puzzle is played or drawn.
`docs/profiles.md` is the whole of it: profiles, friends, mana, and who is sent a gate.

`play.html?id=` plays one puzzle, 5, 10 or 15 squares a side. The board waits behind Tap to start,
which with a mouse says Start, drawn bare until then, with no number and no mark, and the clock runs
from that tap. Fill a square or cross it out with X, by tap, by dragging along a row or column, with
a mouse's right button, which always crosses out, or with the arrow keys, Z and X. On a phone a
15×15 board zooms under two fingers, its numbers staying in view, and there a touch fills as it
lifts. A number greys out when its run of squares is filled, a line with no square of the picture
starts crossed out, and a finished line crosses out its own empty squares. The clock is the score:
filling a square not in the picture is a mistake, crossed out in red, and it adds time, 15 seconds
for a puzzle's first, 30 for its second and a minute for each one after; a hint adds 30 seconds. The
clock is red until the next move, and the best time on a puzzle is the one kept. Hint, or H, lights
the line where the numbers decide the most. Undo, or U, takes back the last tap or drag, and Redo,
or R, puts it back, but neither touches a mistake, and a tap that was only a mistake is no move to
take back. Restart empties the board, and Undo straight after brings it back. Every board has one
footprint, whatever its puzzle's size: the squares together are as wide as the window's width and
height allow, to 600px, and always a multiple of 30px, so a square is whole pixels on a board of
five, ten or fifteen. The corner is a square of one size, 84px on a phone and 120px on a wide
screen, and a tile fills it: the puzzle's name, the picture so far, drawn small, and the clock. The
keys under the board end where it does. A warm line rules off every fifth square. Every other line's
numbers sit on a band that runs out from its squares and fades, larger on larger squares, and a line
with more numbers than its room holds draws them smaller to fit. When the picture is complete the
squares fill in as the picture, in its colours if it has them, and its name shows with the time, the
mistakes and hints, and what they added. Back goes to the puzzle's gate, and Next to that gate's
next unsolved puzzle, then to the gate after it. How to play is three steps in a modal, each with a
small board: what the numbers mean, filling and crossing out, and what a mistake costs. It opens
from the menu on every page and from the button under Start, and by itself on the first puzzle of a
player who has solved none and has not closed it in this browser. A guest has no menu, so the front
page and a gate's have a button for it. The clock stands while it is open. Each move plays a tone,
which the Sound key turns off and an iPhone's silent switch does not, and a phone ticks on each fill
where the browser allows it. A game in progress is kept in the browser, so a reload picks it up.

The leaderboard is switched off by `BOARD` in `app.js`: the front page has no
tabs and no ranking, and results are saved as ever. The puzzle of the day is
switched off by `DAILY` in `app.js`: no page shows it, the leaderboard ranks
all time only, and the maker still dates puzzles so they can be drawn ahead.
With it on, `play.html?daily` plays the puzzle of the day: the one the owner
drew for that day, with its name and colours, or where there is none, one the
browser makes from the date, the same for everyone. Only it counts toward the
days in a row. A player is never sent a day's puzzle before its day.

`make.html` draws a picture that becomes a puzzle, and `make.html?id=` edits or deletes one. The
owner's puzzles go in the owner's gates, and the owner alone has Manage and Players in the menu; a
player's go in gates of their own, through functions that count their mana, and so do the owner's
own at `make.html?own`, which cost none. `make.html?me` draws a player's picture. It checks as you
draw whether the numbers alone can solve the picture and how hard that is, outlines each square that
would need a guess, and saves only a picture with one answer. Size starts a blank board of 5, 10 or
15 a side. Its Colour step paints the picture the puzzle finishes as, from fifty-five inks, and Save
asks which gate it goes in; a gate shows fifteen, the list counts how many of each one's are on, and a
puzzle saved into one with fifteen on is saved off. A gate just started is named there and hidden until
Manage's switch publishes it. No gate yet, first in the list, keeps the puzzle in Unsorted, a
section of Manage. Puzzle of the day, in the same list, makes it a day's puzzle, which sits in no
gate; a day takes one. `docs/making-puzzles.md` is the guide to a good picture and a good gate.

`manage.html` is the owner's desk: every gate on one page, in order, then Unsorted. A gate's heading
has its place and name, a Published or Hidden switch, arrows that move it among the others, a key that
keeps it for picked players, a pencil that renames it and a bin that deletes it and leaves its puzzles
in Unsorted. Under each tile are Edit, Play, which keeps no time for a puzzle no player is sent, and a
switch that sends it to no player when off; a gate has at most fifteen on. Add puzzle, after a gate's
tiles, opens the Pixelator for it. Pressing a tile ticks it, and the ticked are moved, to a gate, a
new one or Unsorted, or deleted; a gate left empty goes too.

## Files

| | |
| :--- | :--- |
| `app.js` | the rules and the board every page shares: the numbers, the line solver, the puzzle of the day, drawing, dragging and zooming, what a mistake costs, tones and the phone's tick |
| `data.js` | who is playing, the name form a guest meets, and where puzzles and results are kept |
| `puzzles.js`, `category.js`, `play.js`, `make.js`, `manage.js`, `players.js`, `me.js`, `friends.js` | each page's own behaviour |
| `app.css` | the board, the picture, the tiles and Manage, under `pixels-` |
| `theme.css` | the fifty-five inks a colour picture is painted from |
| `manifest.json` | the name, the window and the icons a browser installs Pixels with; `app.js` gives it to every browser but an iPhone's. `tools/build-app-icons.mjs` writes the four PNG icons in `brand/` from `brand/favicon.svg` |

## Data

Nine tables in the site's database, which only the owner's account reads directly: `pixels_puzzles`,
every puzzle, which a staff account may read too; `pixels_players`, each player's name and picture
with the account or the hash of the guest's key; `pixels_player_results` and `pixels_player_days`,
each player's best time on a puzzle and on a puzzle of the day; and `pixels_settings`, whether new
players may join; `pixels_friends`, who has added whom; `pixels_player_keys`, the key of each phone
that logged in by a PIN; `pixels_level_players`, the players a gate is kept for; and
`pixels_levels`, each gate's id, name, maker, audience and whether it is hidden. A gate and a puzzle
with no maker are the owner's. `docs/database-access.md` is the rule they follow.

A player's page calls twenty-one functions, which the publishable key may run and which first find
the player from the log-in or the key: `pixels_join`, `pixels_me`, `pixels_puzzles`,
`pixels_results`, `pixels_days`, `pixels_record`, `pixels_record_day`, `pixels_board`,
`pixels_set_picture`, `pixels_rename`, `pixels_people`, `pixels_befriend`, `pixels_renew_invite`,
`pixels_set_pin`, `pixels_login`, and for a player's own gates `pixels_mine`, `pixels_keep_puzzle`,
`pixels_drop_puzzle`, `pixels_name_my_level`, `pixels_publish_my_level` and
`pixels_delete_my_level`. A time is the player's own browser's word: the database refuses only what
cannot be, a time under two seconds, a puzzle the player is not sent, a day more than one from
today. `pixels_puzzles` sends a player no puzzle that is switched off, which is
`pixels_puzzles.hidden`, none in no gate, which is one whose `level` is empty, and none in a gate
that `pixels_sees` says is not theirs to see: that one function is the rule, a hidden gate for
nobody and a gate for everyone, for its maker's friends or for the players picked, as its audience
says.

Five more are the owner's and refuse anyone else. `pixels_share_level` keeps a gate for the players
named, or gives it back to everyone. `pixels_order_levels` renumbers the owner's gates
in one step, so a move cannot stop half done, and each gate keeps its id. `pixels_delete_level`
deletes a gate the same way: its puzzles are left in no gate and the gates after it move up.
`pixels_name_level` and `pixels_hide_level` name and hide a gate, and make its row if it has none.

`players.html` is the owner's: every player with their picture, today's puzzle, days in a row,
puzzles solved and when they last played; the name, which can be typed over; Close joining, which
shuts every invite link to anyone new; Clear picture; the gates players have made, each to hide or
delete; and Remove, which takes a player and their results off the leaderboard.

The local preview, `npm run serve` on :8640, has no log-in, so there Pixels
keeps its puzzles and times in the browser instead, starting from the nine in
`data.js`. The cloud preview on :8641 uses the database.

## Check

    npm run check        from the repository root
