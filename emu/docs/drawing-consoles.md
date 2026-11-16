---
type: how-to
---

# Drawing a console for the room

A console in the room is a pixel drawing, a PNG in `brand/consoles/` named
for its system as `R.SYSTEMS` in `app.js` names it: `snes.png`, `gba.png`,
`psx.png`. The room shows it pixel for pixel in its own colours, the same in
every theme. You draw it in Sprites, the site's pixel editor at `/sprites/`,
in Sprites' palette, `sprites/palette.json`.

## The view

The room is seen from above and in front, so a console shows two faces. Its
top is drawn first and holds what is on top of the real one: the slot, the
lid, the switches. Its front is drawn under that, a tone or two darker, with
the ports and the tray. The two feet are cut from the bottom corners: one
pixel on the two rows above the last, two on the last.

Every console has an outline one pixel wide in black, grey 1: each drawn
pixel with a clear pixel or the canvas's edge beside it, above or below. It
is drawn inside the shape, so the shape keeps its size, and it shows a black
console on a dark shelf and a white one on a light shelf alike. Black
plastic is drawn in grey 4 over grey 3, so its faces show inside the
outline.

## The size

A home console's canvas is 36 by 24, and the console fills its whole height,
so the consoles read as one set. It stands in the middle. Its front comes
from the real console's height, and its top takes the rows left:

- **Front rows** are the real height over 9, rounded to an even number.
- **Top rows** are 24 less the front.
- **Wide** is the real width over 7, rounded to an even number, and never
  over 36.

| Shape | Wide | Top | Front | Consoles |
| :--- | ---: | ---: | ---: | :--- |
| Tall slab | 36 | 14 | 10 | NES, Xbox |
| Mid slab | 36 | 16 | 8 | SNES, N64, PlayStation 2 |
| Low slab | 36 | 18 | 6 | PlayStation |
| Narrow low slab | 24 | 18 | 6 | Wii U |
| Cube | 24 | 12 | 12 | GameCube |
| Tower | 8 | 6 | 18 | Wii |

Filling the height is why a low console's top is deeper than its real depth
would make it. The Switch stands in its dock and keeps its own shape, 24
rows high. A cube's feet are not cut.

A handheld is 24 high and as wide as it needs, up to 36: 16 for a Game Boy.
It lies face up on the table, drawn larger than the home consoles' scale:
its whole face, screen and buttons, over three rows a tone darker for the
edge nearest you. One that folds stands its top screen up behind the half
lying flat. A Game Boy Advance is wider than it is tall, so it fills its
width, 30, and not the height.

## Steps

1. Open Sprites and pick the console from the gallery, or start a new
   drawing at the Home console or Handheld size.
2. Draw it on its shape from the table, in the Sprites palette.
3. Save it as `emu/brand/consoles/<system>.png`, a 1× PNG. Sprites writes
   it straight into the checkout in Chrome.
4. Where the slot or tray moved, set the console's place in `SLOT` in
   `room.js`: how far down the drawing a game goes in, from 0 to 1.
5. Load the room on :8641 again and look at the console in a dark theme and
   a light one, then commit the PNG. The published site shows it after the
   push.
