---
type: how-to
---

# Drawing a console for the room

A console in the room is a pixel drawing that takes the room's theme. You
draw it in any pixel editor in a fixed set of colours, and
`tools/build-consoles.mjs` turns it into its symbol in `brand/consoles.svg`.
Each colour stands for one `--emu-console-*` property, so the same drawing
is lit in the day theme and dark in the evening one.

## The canvas and the palette

`brand/consoles/` holds what to start from, written by
`node emu/tools/build-consoles.mjs --template`:

| File | What it is |
| :--- | :--- |
| `home.png` | a blank 36 by 24 canvas, for a home console |
| `handheld.png` | a blank 16 by 24 canvas, for a handheld |
| `palette.gpl` | the colours, for Aseprite, LibreSprite, Pixelorama or GIMP |
| `palette.png` | the same colours in a strip, for an editor that takes a palette from a picture |

A home console is exactly 36 by 24. A handheld is 24 high and as wide as it
needs, up to 36: 16 for a Game Boy, wider for a Game Boy Advance. Every
console stands on the bottom row, which is the floor of its cubby.

The palette has twenty colours. Each material has three shades, the plain
one, `-hi` for a lit edge and `-lo` for a shadow: `body` for the plastic,
`shade` for a second plastic. `detail` is labels, vents and stickers, `ink`
the darkest lines and slots, and `screen` with `screen-hi` a handheld's
screen, which lights while it plays. Red, purple, teal, blue and green each
have a plain shade and a `-lo` one. Clear pixels stay clear. The palette's
one home is `PALETTE` in `tools/build-consoles.mjs`; the room's `app.css`
sets each property from Design's tokens.

## Steps

1. Copy `home.png` or `handheld.png` to `brand/consoles/<system>.png`,
   named for the system as `R.SYSTEMS` in `app.js` names it: snes for the
   SNES, gba for the Game Boy Advance, psx for the PlayStation.
2. Load `palette.gpl` in the editor and draw with only its colours, with no
   smoothing and no half-clear pixels.
3. Save it as an 8-bit PNG, RGB, RGBA or indexed, not interlaced.
4. Run `node emu/tools/build-consoles.mjs`. It redraws the symbol of each
   console in `brand/consoles/` and leaves the rest as they were. A colour
   outside the palette, or the wrong size, stops it with the file and the
   pixel.
5. Open the room on :8641 and look at the console in both themes, then
   commit the PNG with `brand/consoles.svg`.
