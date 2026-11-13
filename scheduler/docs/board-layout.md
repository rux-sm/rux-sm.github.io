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
| A name | 14px semibold, Carbon's heading-compact-01 with its 0.16px tracking, in the primary text, or on a coloured bar its strongest ink: a bus number, a destination, a driver's name |
| Other words | 12px or 14px on the 18px line |
| An icon | 16px, 4px from its words on every row |
| A row's parts | 8px apart: a time and its track, two drivers, a name and the mark that ends its line |
| A mark's press | 24px across and its row's 18px, round the 16px glyph |
| A bar | 8px clear of the next bar on every side, 4px from each edge of its day and its row |
| A row | no line under it: the bars and tiles are the rows, 8px apart, and 8px from the day band and their surface's edge |
| A surface | three, 16px apart with the page between: the fleet's rows, the partners' and No bus's, each the week's own surface with no line round it. One with no row open takes no room |
| A bus row | a lane for each stacked trip, the bar and 4px above and below it; on six lines 136px for one, 272px for two |
| A driver row | 40px, Carbon's md: the 32px tile and 4px above and below it |
| Insets | 8px inside a card on the board: a bar, a bus tile or a driver tile |

## The day band

32px, above the week and outside what scrolls, so a pull at the board's top
or foot bounces the rows and the band holds still. Its corner stands over
the bus column and its days follow the strip sideways, tied to the week's
scroll by a scroll timeline. It holds the days near the view, three weeks
either side, drawn again as the view nears where they end. The driver
list's band stands above its list the same way.

A scroll stops where the hand leaves it, between rows and days. Once the
board has stood still for a second it glides to the nearest of each: the
bus, or driver in the list, under the band as the first stands, its card 8px
from it, and the day at the bus column's edge. At a list's foot the last
card stands 8px from the foot instead. A press, a key or the wheel in that
second starts it again. A phone's swipe moves the strip one day, and its
rows stop by the browser's own snap.

## The trip bar, on six lines

128px tall, 10px above and below its lines and 8px at its sides. A bar
that spans days is a one-day bar's width in its colour under its words, its
head, on its first day or a live bar's today, and its palette's next darker
step either side, its tail, so the head lines up with the one-day bars
above and below it. A live bar whose head is past its first day leads its
destination with a solid triangle pointing back, and the bus tiles cover the
8px beside them, so its head starts on the edge a bar starting that day does.

| Line | Holds |
| :--- | :--- |
| 1 | The destination, its leg's kind after it, and at the end of its first day its alert or how a trip that is back closed |
| 2 | The customer, at 85% of the bar's ink |
| 3 | The booking contact, the same |
| 4 | The times, 12px semibold as every time on the Mac's board is, a pair with its 2px track between them |
| 5 | The newest update |
| 6 | The drivers |

## The bus tile, on six lines

The column is 80px, with no rule beside it. In it each bus is a tile as a trip is
a bar: a card of the second layer the bar's size and place, 72px wide, as
tall as the bar and level with it, 8px clear of the next bus's tile, the
panel's side and the first day's bars, as a bar is of the next bar,
with the bar's corners.
Its parts stand at the start, 8px in from the card's sides, 56px wide, in
rows, sized below, from the bar's first line to its last, measured from
the top, so a row of stacked trips keeps it on the
first trip's lines. Hover, an open tip and keyboard focus mark the card
alone, as a bar's mark the bar, in Layer 02's hover and selected, or the
Apple themes' accent hover and active; the column around it keeps its
surface.

| Row | Holds | Height |
| :--- | :--- | :--- |
| Number | The number, 14px semibold, a longer one cut short; and while the bus has a mark, its alert at the line's end, at least 8px after it | 18px, the bar's line 1 |
| State | The speed in heading-compact-02 and Idle and Off in heading-compact-01, each on 18px, with mph or elapsed time under it in label-01. A lost signal has its own label, No signal over how long ago it was seen, and a bus without a tracker shows its inspection in label-01, amber within 45 days | 34px, centred between the number and the fuel, 19px from each |
| Fuel | Carbon's gas station at 16px, then 4px on a gauge of four 7px blocks, 2px apart, filled from the left, lit to the nearest quarter of the tank and one while any is left. Grey, orange when low and red when critical, the pump with them. No percent; the phone's column and a screen reader keep it | 18px, the bar's line 6 |

A bus with a tracker has a box round its state, its sides on the card's
8px inset in line with the number and 4px from its words all round, so 14px
clear of the number and the fuel. Low DEF is the bus's mark, and the lift
and sleeper are in its tip. It says whether the engine
runs, so the fuel stands outside it. Off or with no signal it is not
drawn, and the state stands on the card on the number's edge. While the
engine runs, idle or moving, it is the column's own surface, a step below
the card as a bar's tail is below the bar, with no border, and its words
are the green, amber past the speeding limit or idling too long. Views
shorter than six lines have no box, keep the state on one row and the fuel
on the row under it.

56px is the least that holds a number, 8px and its alert.

## The partner and No bus tiles

A partner's row and No bus have the bus tile's card, their parts at the same start.

| Row | Holds | Height |
| :--- | :--- | :--- |
| Name | The partner's name in full, or "No bus", in the bus number's heading-compact-01, on up to three lines, cut after the third; one line in a view of three rows or fewer | Every row above the foot |
| Foot | A partner's: Carbon's collaborate mark at 16px, where a bus tile has its kit. No bus's: the bus with its alert at 16px and how many buses a trip still wants in the days of the board's label, in heading-compact-01, in amber, and nothing while none does | The tile's last row, on the card's inset |

A view of one row shows the name alone.

## The driver tile

The rail is 160px, Carbon's spacing 13, and in it each driver is a tile as
a bus is: a card of the second layer with the bar's corners, 144px wide, 8px clear of the
rail's sides as the bus tile is. Its row is Carbon's md, 40px, and the
card Carbon's sm, 32px, from 4px to 36px of the row. It holds one 18px
line, 7px inside it above and below and 8px in from its sides, 128px
wide, and two cards stand 8px apart, as two bars do. A theme that draws
a line round each pane draws it inside the rail's 160px, so there the card
and its line are 2px narrower. The Apple themes, whose Layer 02 is their
Layer 01, fill the bus and driver tiles with the layer's accent.

| Part | Holds |
| :--- | :--- |
| Name | As far as the first icon drawn: the whole 128px on a tile with none, and 64px beside all three. An icon not drawn keeps its place while one before it is drawn, so each stands in one column down the rail, counted from the tile's end, and the first one drawn stands 8px after the name, as a bar's marks stand from its words |
| Gauge | 16px, a 2px ring, filled clockwise of the ten hours, drawn only while the hours are low, in amber, or there is no clock, dashed |
| Doing | 16px, what they are doing on a trip, 4px after the gauge's place |
| Mark | 16px, at the line's end, 4px after the doing icon |

## The driver's week

With its week out the rail is 440px: the tiles' column, 8px narrower with
each tile on its far edge so a tile stands 8px from its first day's bar as
two bars do, seven of Carbon's 40px md days, and 4px more at each end of
the week. A trip, time off or a
selected trip's open slot is a bar as a trip is on the board: as tall as
the driver tile and level with it, 4px clear of the row's top and foot, and 4px in
from the ends of its days, so a one-day bar is always a 32px square, two
bars on neighbouring days stand 8px apart, as on the board, and a bar on
the first or last day stands 8px from the week's edge. A bar that runs on into the next day
runs to that edge. One that came in from the week before, or runs on past its
last day, keeps the 8px at the week's edge and has a solid triangle there
pointing the way it goes on, unless it carries its rest's hours.

## Each view

A view with fewer bar lines keeps the card the bar's size and drops the
tile's parts from the foot up. The driver rows stay 40px in every view.

| Lines | Bar, its padding | Bus row | Bus tile |
| :--- | :--- | :--- | :--- |
| 6 | 128px, 10px | 136px | Number, the state centred, and fuel on the last line |
| 5 | 112px, 11px | 120px | Number, state and fuel, 12px apart |
| 4 | 96px, 12px | 104px | Number, state and fuel, 8px apart |
| 3 | 80px, 13px | 88px | Number and state |
| 2 | 48px, 6px | 56px | Number, the state at 14px; an inspection's date alone |
| 1 | 32px, 7px | 40px | The number and its alert |

## The phone's board

A phone's board is the compact view whatever the View menu holds: three
lines, the destination, the times and the drivers. Its bar is those lines
and 6px above and below them, 66px, in a row of 74px, and is not rounded to
16px as the Mac's is. The bus column is the narrow one, 41px: the number on
line 1, level with the destination, and under it, from line 2, the state
and fuel centred in what the row leaves, across every lane of a row of
stacked trips: the state its word or its speed's figure alone, in label-01
semibold, and the fuel the tile's four blocks, 34px wide, over its percent
in label-01. A bar's times are 14px there, with a dash and no track.
