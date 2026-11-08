---
type: plan
---

# Plan: one grid for the board's bus, trip and driver tiles

## Goal

The bus tile, the trip bar and the driver tile read as one system: one
style for a name, one line height for the words under it, and every gap on
the same steps, so nothing on the board stands a pixel or two off.

## Decisions

- **Every name is 14px semibold,** Carbon's heading-compact-01: the bus
  number, down from 16px, the trip's destination, as now, and the driver's
  name, up from regular. A picked-out driver is then told by the selected
  fill alone.
- **The frame stays.** A bus row is 144px, three 48px driver rows beside
  it; a bar stands 8px clear of the row's lines and 8px from the next bar;
  an icon is 16px and 4px from its words; inside a card on the board the
  inset is 8px, inside a list or panel 16px, Carbon's split between the two.
- **Every line of words is 18px tall:** a bar's six lines, the bus number's
  line and both lines of a driver tile, whose status line is 16px now.
- **The bus tile stands on its bar's six lines.** The number is line 1, as
  now, level with the destination; the readings square is centred on lines
  2 to 5, 4px clear of them; the lift and sleeper are line 6, level with the
  drivers. Its parts then fill the same 108px the bar's words do, 18px from
  the row's top and from its line, where today they stand 9px and 10px
  around the square and 9px from the line.
- **A low DEF takes line 6,** its name and percent in the warning colour in
  the lift and sleeper's place, where today it grows the square and drops
  them; the square keeps its 64px whatever it holds.
- **A row of stacked trips keeps its tile on the first trip's lines.** Two
  lanes make a 288px row, 16px between the bars, six driver rows beside it,
  and the number stays level with the top bar's destination, the rest of the
  tile empty below.
- **A driver tile is its two 18px lines centred in its 48px row,** where
  today its lines are 18px, a 2px gap and 16px, 5px from the top and 6px
  from its line.
- **A driver tile is 128px wide, from 160px,** 96px inside its 16px insets:
  the widest name in semibold is 55px, so a name and its icon take 75px. Its
  second line is the hours meter alone, run the full 96px, a tenth of it an
  hour, amber under two hours and red at none; the time in words goes, and
  the exact Drive, Shift and Cycle clocks stay in the driver's card. Words
  that stand in the meter's place stay: Over 1:25, Not logged in, in 133, and
  an expired paper as "Licence expired" or "Medical expired", since "Medical
  card expired" is 116px and "Card" alone could be the fuel card. The rail
  is then 128px shut and 352px with its week open, from 160px and 384px.
- **A bar keeps 10px above and below its six lines,** the one gap off the
  4px steps, because it centres 108px of lines in the 128px bar and sets the
  destination level with the bus number.
- **A folded view keeps the rule.** Where the board shows fewer lines, the
  bus tile drops parts as it does now, and what is left stands on the lines
  that remain.

## Questions

None open.

## Tasks

- [ ] Draw the bus tile's states on `scheduler/components.html` with
  invented content, on a Mac board of six lines: a low DEF, no signal, a
  long name, a bus with an inspection date only, a partner's bus, No bus and
  a row of stacked trips, and measure each there.
- [ ] Add the phone's board to the views in `scheduler/docs/board-layout.md`.
