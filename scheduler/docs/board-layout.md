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
| A driver row | 48px, Carbon's lg table row, its default; three stand beside a six-line bus row |
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

The column is 88px and its 1px rule. In it each bus is a tile as a trip is
a bar: a card of the second layer the bar's size and place, 72px wide, as
tall as the bar and 8px clear of the row's lines and the column's sides, as
a bar is of the row's lines and the column's rule, with the bar's corners.
Its parts stand at the start, 8px in from the card's sides, 56px wide, in
rows 8px apart from the bar's first line to the card's 8px inset at its
foot, measured from the top, so a row of stacked trips keeps it on the
first trip's lines. Hover, an open tip and keyboard focus mark the card
alone, as a bar's mark the bar, in Layer 02's hover and selected, or the
Apple themes' accent hover and active; the column around it keeps its
surface.

| Row | Holds | Height |
| :--- | :--- | :--- |
| Number | The number, 14px semibold, a longer one cut short; and while the bus has a mark, its alert at the line's end, at least 8px after it | 18px, the bar's line 1 |
| Speed | The figure at 16px semibold, then 2px on mph or how long at 12px: "57 mph", "Idle 37m", "Off 6h". With no tracker, the inspection's word and date | 22px, 8px under the number |
| Speed's meter | Eight blocks across the 56px, 1px apart, one lit for each 10 mph to 80, green while moving and amber over 75 | 8px, 4px under the figure |
| Fuel | The pump at 16px, then 4px on the percent at 14px semibold; orange when low, red when critical | 18px, 8px under the meter |
| Kit | The lift and the sleeper, 16px icons 4px apart, or a low DEF in their place | 16px, 8px under the fuel, on the card's inset |

56px is the least that holds a number, 8px and its alert.

## The driver tile

The rail is 160px, Carbon's spacing 13, and in it each driver is a tile as
a bus is: a card of the second layer with the bar's corners, 144px wide, 8px clear of the
rail's sides and the row's lines as the bus tile is. Its row is Carbon's
lg table row, 48px, and the card Carbon's sm, 32px, from 8px to 40px of
the row. It holds one 18px line, 7px inside it above and below and 8px in
from its sides, 128px wide, and two cards stand 16px apart across the row's
line, as two buses' bars do. The Apple themes, whose Layer 02 is their
Layer 01, fill the bus and driver tiles with the layer's accent.

| Part | Holds |
| :--- | :--- |
| Name | What the icon and gauge leave of the 128px, 84px with both |
| Gauge | 16px, a 2px ring, at least 8px after the name, as a bar's marks stand from its words, filled clockwise of the ten hours |
| Icon | 16px, at the line's end, 4px after the gauge or at least 8px after the name |

## The driver's week

With its week out the rail is 448px: the 160px tiles, seven of Carbon's
40px md days, and 4px more at each end of the week. A trip, time off or a
selected trip's open slot is a bar as a trip is on the board: as tall as
the driver tile and level with it, 8px clear of the row's lines, and 4px in
from the ends of its days, so a one-day bar is always a 32px square, two
bars on neighbouring days stand 8px apart, as on the board, and a bar on
the first or last day stands 8px from the week's edge. A bar that runs on into the next day,
or past the week's edge, runs to that edge.

## Each view

A view with fewer bar lines keeps the card the bar's size and drops the
tile's parts from the foot up. The driver rows stay 48px in every view.

| Lines | Bar, its padding | Bus row | Bus tile |
| :--- | :--- | :--- | :--- |
| 6 | 128px, 10px | 144px | Number, speed, its meter, fuel, kit or low DEF |
| 5 | 112px, 11px | 128px | Number, speed, its meter, fuel |
| 4 | 96px, 12px | 112px | Number, speed, fuel |
| 3 | 80px, 13px | 96px | Number, speed |
| 2 | 48px, 6px | 64px | Number, the state at 14px; an inspection's date alone |
| 1 | 32px, 7px | 48px | The number and its alert |

## The phone's board

A phone's board is the compact view whatever the View menu holds: three
lines, the destination, the times and the drivers. Its bar is those lines
and 6px above and below them, 66px, in a row of 82px, and is not rounded to
16px as the Mac's is. The bus column is the narrow one, 41px: the number on
line 1, level with the destination, and under it, from line 2, the state
and fuel centred in what the row leaves, across every lane of a row of
stacked trips. The lift and sleeper are not drawn there.
