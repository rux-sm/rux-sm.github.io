# Pixels

Picture logic puzzles, and a maker to draw your own — one app on [design](../design/), served at **rux-sm.github.io/pixels/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md`
lists what is unfinished here.

## What it is

`index.html` lists every puzzle, ten to a level in the order they were made,
with nothing locked. A solved puzzle shows its picture, name, stars and best
time; an unsolved one a question mark and how hard it is, and its name stays
hidden until it is solved.

`play.html?id=` plays one 10×10 puzzle. Fill a square or cross it out with X,
by tap, by dragging along a row or column, or with the arrow keys, Z and X.
A number greys out when its run of squares is filled, and a finished line
crosses out its own empty squares. A puzzle starts with three stars: filling
a square not in the picture is a mistake, crossed out in red, and it costs a
star, as does a hint; the last star is never lost. Hint, or H, lights the line
where the numbers decide the most. When the picture is complete the squares
fill in as the picture and its name shows. A phone ticks on each fill where
the browser allows it. Free mode points out nothing: a wrong square fills
like a right one, Fill empties a filled square, there is no hint, and the
puzzle is solved when the filled squares are exactly the picture. A game in
progress is kept in the browser, so a reload picks it up.

`make.html` draws a picture that becomes a puzzle, and `make.html?id=` edits
or deletes one. It checks as you draw whether the numbers alone can solve the
picture and how hard that is, outlines each square that would need a guess,
and saves only a picture with one answer. `docs/making-puzzles.md` is the
guide to a good picture and a good level.

## Files

| | |
| :--- | :--- |
| `app.js` | the rules and the board every page shares: the numbers, the line solver, drawing and dragging, stars and the phone's tick |
| `data.js` | where puzzles, best times and stars are kept |
| `puzzles.js`, `play.js`, `make.js` | each page's own behaviour |
| `app.css` | the board, the picture and the puzzle list, under `pixels-` |

## Data

Two tables in the site's database: `pixels_puzzles`, every puzzle, shared, and
`pixels_results`, each account's best time and most stars on each puzzle. Both are staff
only, and an account reads and writes only its own results.
`docs/database-access.md` is the rule they follow.

The local preview, `npm run serve` on :8640, has no log-in, so there Pixels
keeps its puzzles and times in the browser instead, starting from the ten in
`data.js`. The cloud preview on :8641 uses the database.

## Check

    npm run check        from the repository root
