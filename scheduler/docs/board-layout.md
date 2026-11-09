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
| A driver row | 64px, Carbon's xl table row, the one for two lines; it does not line up with the bus rows |
| Insets | 8px inside a card on the board: a bar, a bus tile or a driver tile |

## The trip bar, on six lines

128px tall, 10px above and below its lines and 8px at its sides. A bar
that spans days is a one-day bar's width in its colour under its words, its
head, on its first day or a live bar's today, and its palette's next darker
step either side, its tail, so the head lines up with the one-day bars
above and below it.

| Line | Holds |
| :--- | :--- |
| 1 | The destination, its leg's kind after it, and at the end of its first day its alert or how a trip that is back closed |
| 2 | The customer |
| 3 | The booking contact |
| 4 | The times, 14px |
| 5 | The newest update |
| 6 | The drivers |

## The bus tile, on six lines

The column is 72px and its 1px rule. In it each bus is a tile as a trip is
a bar: a card of the second layer the bar's size and place, 56px wide, as
tall as the bar and 8px clear of the row's lines and the column's sides, as
a bar is of the row's lines and the column's rule, with the bar's corners.
Its parts stand centred inside it, the bar's 8px in from its sides, on the
bar's lines. Hover, an open tip and keyboard focus mark the card alone, as
a bar's mark the bar, in Layer 02's hover and selected, or the Apple themes'
accent hover and active; the column around it keeps its surface. Its alert hangs on the card's top-right corner, on a 20px disc
of the column's surface that ends at the column's edge, 2px under the row's
line. It is measured from the top, so
a row of stacked trips keeps it on the first trip's lines.

| Line | Holds |
| :--- | :--- |
| 1 | The number, centred, a longer one cut short |
| 2 to 5 | The readings, 40px wide and centred on the lines, 4px clear of them: the state's 16px semibold reading over its unit, and the fuel's meter alone across them, 40px |
| 6 | The lift and the sleeper, 16px icons, centred, or a low DEF in their place, its name alone in the low or critical colour |

At this width the widest words, an inspection date such as Nov 20, fill the
40px, a four-figure number is cut short, and on three and two lines, where
the state stands beside its unit, they stand 6px inside the card where the
rest stand 8px.

## The driver tile

The rail is 128px, and in it each driver is a tile as a bus is: a card of
the second layer with the bar's corners, 112px wide, 8px clear of the
rail's sides and the row's lines as the bus tile is. Its row is Carbon's
xl table row, 64px, the size Carbon gives a row of two lines, and the card
Carbon's lg, 48px, from 8px to 56px of the row. It holds the name's 18px
line over a 16px one, with 7px above and below, the lines 8px in from its
sides, 96px wide, and two cards stand 16px apart across the row's line, as
two buses' bars do. The Apple themes, whose Layer 02 is their Layer 01, fill the bus
and driver tiles with the layer's accent.

| Line | Holds |
| :--- | :--- |
| 1, 18px | The name, its one icon at the line's end |
| 2, 16px | The hours meter across the line, 96px, a tenth of it an hour; or the words that stand in its place |

## The driver's week

With its week out the rail is 408px: the 128px tiles and seven of
Carbon's 40px md days. A trip, time off or a selected trip's open slot is a
bar as a trip is on the board: as tall as the driver tile and level with
it, 8px clear of the row's lines, and 8px in from the ends of its days, so
a one-day bar is 24px wide; where the next day holds another bar, each
stands 4px from the day's edge, so two bars are 8px apart, as on the
board. A bar that runs on into the next day, or past the week's edge, runs
to that edge.

## Each view

A view with fewer bar lines keeps the card the bar's size, the number level
with the destination, and the readings on the lines under the number, four
at most, less 4px at each end. The driver rows stay 64px in every view.

| Lines | Bar, its padding | Bus row | Bus tile |
| :--- | :--- | :--- | :--- |
| 6 | 128px, 10px | 144px | Number; readings 64px tall; lift, sleeper or low DEF on line 6 |
| 5 | 112px, 11px | 128px | Number; readings 64px tall, grown by a low DEF |
| 4 | 96px, 12px | 112px | Number; readings 46px tall, no fuel |
| 3 | 80px, 13px | 96px | Number; the state beside its unit |
| 2 | 48px, 6px | 64px | Number; the state on line 2 |
| 1 | 32px, 7px | 48px | The number alone |

## The phone's board

A phone's board is the compact view whatever the View menu holds: three
lines, the destination, the times and the drivers. Its bar is those lines
and 6px above and below them, 66px, in a row of 82px, and is not rounded to
16px as the Mac's is. The bus column is the narrow one, 41px: the number on
line 1, level with the destination, and under it, from line 2, the state
and fuel centred in what the row leaves, across every lane of a row of
stacked trips. The lift and sleeper are not drawn there.
