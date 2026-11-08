---
type: reference
---

# The board's tiles: their sizes

The bus tile, the trip bar and the driver tile on the Mac's board stand on
one grid of 18px lines. Every measure here is taken in Chrome on the board
and is what `scheduler/app.css` draws; what each part says is in
`scheduler/docs/screen-inventory.md`.

## The grid

| Part | Size |
| :--- | :--- |
| A line | 18px, `--scheduler-row-h`, Carbon's 14px compact line |
| A name | 14px semibold, Carbon's heading-compact-01: a bus number, a destination, a driver's name |
| Other words | 12px or 14px on the 18px line |
| An icon | 16px, 4px from its words |
| A bar | 8px clear of the row's lines and of the next bar |
| A bus row | a lane for each stacked trip; on six lines 144px for one, 288px for two |
| A driver row | 48px, three beside one lane on six lines |
| Insets | 8px inside a card on the board, a bar or a bus tile; 16px inside a list, the driver rail |

## The trip bar, on six lines

128px tall, 10px above and below its lines and 8px at its sides.

| Line | Holds |
| :--- | :--- |
| 1 | The destination, its leg's kind after it, and at the end of its first day its alert or how a trip that is back closed |
| 2 | The customer |
| 3 | The booking contact |
| 4 | The times, 14px |
| 5 | The newest update |
| 6 | The drivers |

## The bus tile, on six lines

80px, Carbon's spacing 11, and the column's 1px rule, 8px in from its
sides: the width the 64px readings square takes, since the square is as tall
as four lines less 8px. Its parts stand at its start, as a driver tile's and
a bar's words do. It is measured from the top, so a row of stacked trips
keeps it on the first trip's lines.

| Line | Holds |
| :--- | :--- |
| 1 | The number at the start, 44px of room, a longer one cut short; its alert at the line's end |
| 2 to 5 | The readings square across the tile, 64px, 4px clear of the lines: the state's 16px semibold reading over its unit, and the fuel's meter alone across it, 48px |
| 6 | The lift and the sleeper, 16px icons, at the start, or a low DEF in their place |

The square sets the width: a narrower tile would make it a rectangle or
take its 8px insets. Next come a low DEF's words, 52px, and an inspection
date in the square, 39px inside its 8px padding; the kit's two icons take
34px and the number and its alert 46px.

## The driver tile

128px, 16px in from its sides, in a 48px row: 5px, then two 18px lines,
then 6px above the row's line.

| Line | Holds |
| :--- | :--- |
| 1 | The name, its one icon at the line's end |
| 2 | The hours meter across the line, 96px, a tenth of it an hour; or the words that stand in its place |

## Each view

A view with fewer bar lines keeps the number level with the destination,
and the square fills the lines under the number, four at most, less 4px at
each end. The driver rows stay 48px, so they line up with the bus rows on
six lines alone.

| Lines | Bar, its padding | Bus row | Bus tile |
| :--- | :--- | :--- | :--- |
| 6 | 128px, 10px | 144px | Number; square 64px; lift, sleeper or low DEF on line 6 |
| 5 | 112px, 11px | 128px | Number; square 64px, grown by a low DEF |
| 4 | 96px, 12px | 112px | Number; square 46px, no fuel |
| 3 | 80px, 13px | 96px | Number; square 28px, the state beside its unit |
| 2 | 48px, 6px | 64px | Number; the state on line 2, no square |
| 1 | 32px, 7px | 48px | The number alone |

## The phone's board

A phone's board is the compact view whatever the View menu holds: three
lines, the destination, the times and the drivers. Its bar is those lines
and 6px above and below them, 66px, in a row of 82px, and is not rounded to
16px as the Mac's is. The bus column is the narrow one, 41px: the number on
line 1, level with the destination, and under it, from line 2, the state
and fuel centred in what the row leaves, across every lane of a row of
stacked trips. The lift and sleeper are not drawn there.
