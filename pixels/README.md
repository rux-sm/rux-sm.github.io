# Pixels

Picture logic puzzles by the rules of Picross DS, and a maker to draw your
own — one app on [design](../design/), served at **rux-sm.github.io/pixels/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md`
lists what is unfinished here.

## What it is

`index.html` lists every puzzle, ten to a level in the order they were made,
with nothing locked. A solved puzzle shows its picture, name and best time; an
unsolved one a question mark, and its name stays hidden until it is solved.

`play.html?id=` plays one 10×10 puzzle. Fill a square or cross it out with X,
by tap, by dragging along a row or column, or with the arrow keys, Z and X.
Filling a square not in the picture is a mistake: it is crossed out in red and
2, then 4, then 8 minutes are added to the clock. A line's numbers grey out
when it is right. Free mode points out nothing: a wrong square fills like a
right one, Fill empties a filled square, and the puzzle is solved when the
filled squares are exactly the picture. A game in progress is kept in the
browser, so a reload picks it up.

`make.html` draws a picture that becomes a puzzle, and `make.html?id=` edits
or deletes one. It checks as you draw whether the numbers alone can solve the
picture, outlines each square that would need a guess, and saves only a
picture with one answer.

## Files

| | |
| :--- | :--- |
| `app.js` | the rules and the board every page shares: the numbers, the line solver, drawing and dragging |
| `data.js` | where puzzles and best times are kept |
| `puzzles.js`, `play.js`, `make.js` | each page's own behaviour |
| `app.css` | the board, the picture and the puzzle list, under `pixels-` |

## Data

Two tables in the site's database: `pixels_puzzles`, every puzzle, shared, and
`pixels_results`, each account's best time on each puzzle. Both are staff
only, and an account reads and writes only its own results.
`docs/database-access.md` is the rule they follow.

The local preview, `npm run serve` on :8640, has no log-in, so there Pixels
keeps its puzzles and times in the browser instead, starting from the ten in
`data.js`. The cloud preview on :8641 uses the database.

## Check

    npm run check        from the repository root
