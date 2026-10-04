---
type: how-to
---

# Draw an app icon

Every app but Home has one icon, `icon.svg` in its own `brand/` folder. The
home page shows it on the app's tile at 32px, painted in the tile's text
colour. `switcher.json` names the file, and the check fails an app that has
none.

## The board

Open `docs/app-icon-template.svg` in a drawing app. It is 16 squares wide and
16 tall, and one unit is one square. Turn on snap to grid, or snap to pixels,
so every shape lands on whole squares.

The template has three layers. `board` is a white square at the bottom.
`icon` is empty, and the drawing goes in it. `guides` sits on top and shows
every square, the drawing area, and the centre.

## The rules

1. **Whole squares only.** No curves, no slanted lines and no half squares; a
   slope is a staircase. A part square blurs at 32px.
2. **One solid shape colour.** No outlines, no greys and no gradients. The
   page throws the colour away and paints the shape itself.
3. **A hole is empty squares.** Leave squares out to cut a detail into a
   shape, as the seven is cut into the Sevens card.
4. **Stay inside the drawing area.** Leave one empty square on every side, so
   the drawing is at most 14 squares wide and 14 tall.
5. **Fill the drawing area.** The longer side is 14 squares and the shorter is
   at least 11, so every icon reads as the same size.
6. **Centre it.** The empty space left and right is equal, and top and bottom
   differ by no more than one square.
7. **Draw it heavy.** Fill about 80 to 140 of the board's 256 squares. A thin
   outline looks faint beside the others.
8. **Nothing thinner than one square.** A line is one or two squares thick,
   and a gap between two parts is at least one square.
9. **One object.** One thing a person can name from its outline, with no
   words.

## Save it

1. Delete the `board` and `guides` layers, so only the drawing is left.
2. Export as SVG, 16 by 16, to `icon.svg` in the app's `brand/` folder.
3. For a new app, add `"icon": "/name/brand/icon.svg"` to its entry in
   `switcher.json`.
4. Run `npm run check`, then look at the tile on the home page in a light
   theme and a dark one.
