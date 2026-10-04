# Pixels

Picture logic puzzles, and a maker to draw your own — one app on [design](../design/), served at **rux-sm.github.io/pixels/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md`
lists what is unfinished here.

## What it is

`index.html` shows today's puzzle and the days solved in a row, then every
puzzle by the level its maker gave it, easy to hard, with nothing locked.
The 5×5 levels are called Quick and come first, the 15×15 ones Long and come
last. A
solved puzzle shows its picture, name, stars and best time; an unsolved one a
question mark and how hard it is, and its name stays hidden until it is
solved.

`play.html?id=` plays one puzzle, 5, 10 or 15 squares a side. The board
waits behind Tap to start, and the clock runs from that tap. Fill a square
or cross it out with X, by tap, by dragging along a row or column, or with
the arrow keys, Z and X. On a phone a 15×15 board zooms under two fingers,
its numbers staying in view, and there a touch fills as it lifts.
A number greys out when its run of squares is filled, and a finished line
crosses out its own empty squares. A puzzle starts with three stars: filling
a square not in the picture is a mistake, crossed out in red, and it costs a
star, as does a hint; the last star is never lost. Hint, or H, lights the line
where the numbers decide the most. Undo, or U, takes back the last tap or
drag, and Redo, or R, puts it back, but neither touches a mistake. Restart
empties the board, and Undo straight after brings it back. The puzzle's
name, the clock and the stars sit in the board's corner, and the numbers
keep the same space on every puzzle of a size. When the picture is complete the squares
fill in as the picture, in its colours if it has them, and its name shows.
Each move plays a tone, which the Sound switch turns off and an iPhone's
silent switch does not, and a phone ticks
on each fill where the browser allows it. Free mode points out nothing: a wrong square fills
like a right one, Fill empties a filled square, there is no hint, and the
puzzle is solved when the filled squares are exactly the picture. A game in
progress is kept in the browser, so a reload picks it up.

`play.html?daily` plays the puzzle of the day, which the browser makes from
the date, the same for everyone. Only it counts toward the days in a row.

`make.html` draws a picture that becomes a puzzle, and `make.html?id=` edits
or deletes one. It checks as you draw whether the numbers alone can solve the
picture and how hard that is, outlines each square that would need a guess,
and saves only a picture with one answer. Size starts a blank board of 5,
10 or 15 a side. Its Colour step paints the picture
the puzzle finishes as, from eight inks, and Level places it on the front
page. `docs/making-puzzles.md` is the guide to a good picture and a good
level.

## Files

| | |
| :--- | :--- |
| `app.js` | the rules and the board every page shares: the numbers, the line solver, the puzzle of the day, drawing, dragging and zooming, stars, tones and the phone's tick |
| `data.js` | where puzzles, best times, stars and solved days are kept |
| `puzzles.js`, `play.js`, `make.js` | each page's own behaviour |
| `app.css` | the board, the picture and the puzzle list, under `pixels-` |
| `theme.css` | the eight inks a colour picture is painted from |

## Data

Three tables in the site's database: `pixels_puzzles`, every puzzle, shared;
`pixels_results`, each account's best time and most stars on each puzzle; and
`pixels_daily`, the same for each puzzle of the day it solved. All are staff
only, and an account reads and writes only its own results.
`docs/database-access.md` is the rule they follow.

The local preview, `npm run serve` on :8640, has no log-in, so there Pixels
keeps its puzzles and times in the browser instead, starting from the ten in
`data.js`. The cloud preview on :8641 uses the database.

## Check

    npm run check        from the repository root
