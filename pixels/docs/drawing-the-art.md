---
type: how-to
---

# Drawing the art

Every picture rux draws for Pixels has a file ready in Aseprite, in
`pixels/art/source/`. Each is the right size and holds only the game's
fifty-five inks, so a colour from anywhere else cannot be painted.

| File | Squares | What it is |
| :--- | :--- | :--- |
| `character.aseprite` | 15 × 15 | the character, a layer to each part |
| `sword.aseprite`, `shield.aseprite` | 9 × 9 | the two halves of the fill and X switch |
| `map-1.aseprite` to `map-6.aseprite` | 120 × 80 | a part of the map, one to a rank, `map-1` at the foot |
| `fog.aseprite` | 120 × 24 | the band over the highest part that shows |
| `rift-01.aseprite` to `rift-12.aseprite` | 120 × 40 | a rift's world, over its puzzles |

An enemy is drawn in the Pixelator, in its frame on Manage, not here.

## Draw

1. Open the file in Aseprite. Each starts as its placeholder, to draw over.
2. Paint one square to a pixel. Keep the canvas its size.
3. Save it, with Cmd S, in the same place.
4. In the repository, put it in the game:

       node pixels/tools/build-art.mjs

5. Look at it on :8641, then commit and push.

View › Show › Grid draws a line every 5 squares on the character, every 3
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

## The map

- Draw on the **ground** layer. **Keep clear** lies over it: a pink square
  where the game draws a portal, and a box under it where the rift's name
  and count go. Keep the square empty and the box calm. Keep clear is left
  out of the picture the game shows.
- The path enters at the foot and leaves at the top in the middle, so one
  part joins the next.
- On `map-1`, draw the side place in the **dashed square**. It leads to the
  rifts outside the course.
- The fog's last 8 rows lie over the top of the part below, so they thin out
  to nothing, and a part's top 8 rows are drawn knowing fog covers them.

## A rift's world

A rift's file starts blank. It reaches the game once anything is drawn on
it, and a rift left blank has no world.

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
