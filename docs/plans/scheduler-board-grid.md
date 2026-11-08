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
- **A driver tile is its two 18px lines centred in its 48px row,** where
  today its lines are 18px, a 2px gap and 16px, 5px from the top and 6px
  from its line.
- **A bar keeps 10px above and below its six lines,** the one gap off the
  4px steps, because it centres 108px of lines in the 128px bar and sets the
  destination level with the bus number.
- **A folded view keeps the rule.** Where the board shows fewer lines, the
  bus tile drops parts as it does now, and what is left stands on the lines
  that remain.

## Questions

None open.

## Tasks

- [ ] Set the bus number and the driver name in the destination's 14px
  semibold, and take semibold off as the picked-out driver's own mark.
- [ ] Set a driver tile's status line at 18px and centre its two lines in
  the row.
- [ ] Stand the bus tile's square and kit on the bar's lines, in the full
  view and every folded one, keeping each number centred.
- [ ] Measure each tile in Chrome on :8641 in every row view and in Gray 100
  and Rux 100, and update the bus column and driver tile lines in
  `scheduler/docs/screen-inventory.md` and the comments in
  `scheduler/app.css` with each change.
