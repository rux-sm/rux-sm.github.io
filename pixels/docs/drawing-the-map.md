---
type: how-to
---

# Drawing a part of the map

The world map on the front page is seven pictures in `pixels/art/`. Each
starts as a placeholder, which is also its template.

| File | Squares | What it is |
| :--- | :--- | :--- |
| `map-1.png` to `map-6.png` | 120 wide, 80 tall | a part of the map, one to a rank, `map-1.png` at the foot |
| `fog.png` | 120 wide, 24 tall | the band over the highest part that shows |

## Draw a part

1. Open the part's file in a pixel art app. It shows the ground, the path,
   and the marks to keep clear.
2. Draw over it, one pixel to a square. Keep the canvas 120 by 80.
3. Keep each **solid square** clear, 15 squares a side. The game draws a
   rift's portal there.
4. Keep each **dotted box** under a square calm. A plate with the rift's
   name and count lies over it.
5. Let the path enter at the foot and leave at the top where the template's
   does, in the middle, so one part joins the next.
6. On `map-1.png`, draw the side place in the **dashed square**. It leads to
   the rifts outside the course, and its words lie in the box under it.
7. Paint from the game's fifty-five inks, which `pixels/theme.css` lists, so
   the map sits with the sprites.
8. Save it as a PNG over the placeholder, at the same name and the same
   size, with no smoothing.

## Draw the fog

Keep it 120 by 24. Its last 8 rows lie over the top of the part below, so
they thin out to nothing, and a part's top 8 rows are drawn knowing fog
covers them.

## Move a spot

A rift's spot is two numbers in `pixels/puzzles.js`, in `SPOTS`: the top left
square of its portal, counted from the top left of its part. `SIDE` is the
side place's. For a part still on its placeholder, change the numbers, delete
the part's file, and run:

    node pixels/tools/build-placeholders.mjs

It writes only the files that are not there, so a part already drawn is
never painted over. A part already drawn is moved in the drawing instead.
