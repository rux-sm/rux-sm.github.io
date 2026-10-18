---
type: how-to
---

# Drawing the art

Every picture rux draws for Pixels has a file ready in Aseprite, in
`pixels/art/source/`. Each is the right size and holds only the game's
sixty inks, so a colour from anywhere else cannot be painted.

The palette is the sixty inks, five to a row, a colour to a row, and last
the clear colour. **Never drag a colour to a new place in it.** A pixel
remembers its place in the palette, not its colour, so a moved colour
repaints every pixel that used that place.

| File | Squares | What it is |
| :--- | :--- | :--- |
| `character.aseprite` | 24 × 32 | the character, a layer to each part, for fights and Me |
| `character-map.aseprite` | 15 × 15 | its small version, for the map, the same layers |
| `sword.aseprite`, `shield.aseprite` | 9 × 9 | the two halves of the fill and X switch |
| `map-1.aseprite` to `map-6.aseprite` | 90 × 60 | a part of the map, one to a rank, `map-1` at the foot |
| `fog.aseprite` | 90 × 18 | the band over the highest part that shows |
| `rift-01.aseprite` to `rift-12.aseprite` | 90 × 30 | a rift's world, over its puzzles |
| `icons.aseprite` | 12 × 12 | the game's icons, a frame to each, named by its tag |
| `puzzles.aseprite` | a row to each rift | every puzzle of the course, a cell to each |

An enemy is drawn on the puzzle sheet, below, or one at a time in the
Pixelator, in its frame on Manage.

## Draw

1. Open the file in Aseprite. Each starts as its placeholder, to draw over.
2. Paint one square to a pixel. Keep the canvas its size.
3. Save it, with Cmd S, in the same place.
4. In the repository, put it in the game:

       node pixels/tools/build-art.mjs

5. Look at it on :8641, then commit and push.

View › Show › Grid draws a line every 8 squares on the character, 5 on its
map version, every 3
on the switch, and every 10 on the big pictures.

## The character

The layers lie over one another as the game draws them, from the foot of the
list up: skin, eyes, hair, helmet, body, body armour, hands and feet, shield
and sword.

- **Skin and eyes are each one ink.** The player picks the colour; any ink
  marks the squares.
- **The helmet covers the hair** once a player earns it. Hide the helmet
  layer to see the hair.
- **A piece of armour is the squares its layer fills.** A player paints only
  those squares, so redrawing a piece's shape sets a player's own drawing of
  it back to yours.
- **The sword and the shield move by themselves** in a fight, so keep each to
  its own layer.
- **Draw it facing right,** toward the enemy it fights.
- **Draw the big one first, then the map version** from it: the same
  colours and pieces, cut down to 15 squares. A player draws on the big
  one, and the map version wears each piece in your colours.
- **The game draws the map version for now.** The big one goes in once it
  is drawn and the game can show it.

## The map

- Draw on the **ground** layer. **Keep clear** lies over it: a pink square
  where the game draws a portal. Keep the square empty. Keep clear is left
  out of the picture the game shows.
- The path enters at the foot and leaves at the top in the middle, so one
  part joins the next.
- On `map-1`, draw the side place in the **dashed square**. It leads to the
  rifts outside the course.
- The fog's last 6 rows lie over the top of the part below, so they thin out
  to nothing, and a part's top 6 rows are drawn knowing fog covers them.

## The icons

Each icon is a frame, and its name is the tag over it in the timeline. Draw
inside the pink ring of the Guide layer, the middle 10 × 10, so icons keep a
pixel of room round them. Use one ink: the game draws an icon in the words'
colour, and an icon not drawn yet stays Carbon's. Draw each icon in its own
frame on the icon layer, since a frame's tag is what names it. Keep lines a whole pixel thick and shapes simple, because at 12 × 12
one pixel is a tenth of the icon.

## A rift's world

A rift's file starts blank. It reaches the game once anything is drawn on
it, and a rift left blank has no world.

## The puzzle sheet

`puzzles.aseprite` holds the whole course, a row to each rift with its
number and name over it, fifteen cells at the rift's size, and the boss's
cell framed in red. Hover a cell to see its enemy's name.

- Draw the answer on the **squares** layer, in any ink: every square with
  ink is one to fill.
- Paint the finished picture on the **picture** layer, every square of the
  cell, or leave it empty for a puzzle that ends in black and white.
- Keep inside a cell's frame. The **Guide** layer is never read.

To put the sheet in the game, ask for an import. It reads the course from
the database into a file, then runs:

    node pixels/tools/check-puzzle-sheet.mjs <course.json> --sql <file>

It lists every cell that differs from the database: those that pass, with
how hard they are, and those held back, with why. Nothing is written until
you say yes; then the one statement it wrote saves them over their
placeholders, switched on or off as they were. A cell emptied on the sheet
never erases a drawn puzzle. `build-puzzle-sheet.mjs` makes the sheet
again from the database, if the file is ever lost.

## Move a spot

A rift's spot is two numbers in `pixels/puzzles.js`, in `SPOTS`: the top left
square of its portal, counted from the top left of its part. `SIDE` is the
side place's. For a part not drawn yet, change the numbers, delete the
part's PNG in `pixels/art/` and its Aseprite file in `pixels/art/source/`,
and run:

    node pixels/tools/build-placeholders.mjs
    node pixels/tools/build-art.mjs templates

Each writes only the files that are not there, so a drawing is never painted
over. A part already drawn is moved in the drawing instead.
