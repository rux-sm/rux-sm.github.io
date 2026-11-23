# Sprites

A pixel-art editor for icons and sprites that saves straight into this
checkout. It's one app on [design](../design/), served at
**rux-sm.github.io/sprites/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md`
lists what is unfinished here.

## What it is

`index.html` is the whole app, in two views. It opens on the gallery: a
New drawing tile, then a tile for every saved drawing, then the elements
of an app that show one. A tile opens the
editor: the drawing on a stage at a whole zoom, the tools above it and the
colours beside it, with Gallery to go back.

- **Tools:** pencil, eraser, fill, picker and select, with mirror, undo and
  redo, and zoom. The keys are B, E, G, I, S, M, + and −, 0 to fit, Cmd Z
  and Shift Cmd Z, and Cmd S to save. Holding Alt picks a colour with any
  tool.
- **Select:** drag a box over part of the drawing, then drag inside the box
  to move what is in it, or press an arrow key to move it a pixel. Cmd A
  selects the whole drawing, and Delete clears what the box holds. A press
  outside the box or Escape drops it. Crop, in the bar, trims the drawing
  to the box.
- **Size:** presets for an Emu home console, 36 × 24, an Emu handheld, 24
  high and up to 36 wide, and icons at 16 and 32, or any size up to 256.
  Resize keeps the drawing anchored to its bottom left.
- **Palettes:** Sprites' own 122 colours, in `palette.json`, with any colour
  beside them; Sprites P3, the same 122 made more vivid for a Display P3
  screen and worked out from `palette.json` as the page loads. Switching carries each colour to the
  one of the same name, so a drawing moves between Sprites and Sprites P3
  and back unchanged.
- **Saving:** a path in the checkout and a format: PNG at 1×, 2×, 4× or
  8×, or SVG. A new drawing's path starts in `sprites/art/`, the home of
  every drawing, under a name no file has yet; a path another file holds is
  written over only on a second Save. A larger PNG is a copy, and leaves
  the drawing's own changes not saved. A Sprites P3 PNG carries a Display P3
  profile, which Open reads to open it in Sprites P3 again; its SVG paints
  each colour in P3 over an sRGB fill.
- **A drawing's menu:** a right click on its tile offers Rename, which
  keeps its folder and its apps; Duplicate, a copy beside it; Assign to;
  and Delete, which asks first and closes the drawing if it is open. A
  drawing an app shows offers Unassign in Delete's place. The Not saved
  tile offers Discard changes.
- **Assigning:** an element is a place in an app that shows a drawing, a
  file the app reads. Assign to picks the element; Sprites writes the element's file from the
  drawing as a 1× PNG and records the pair in `assigned.json`. Saving the
  drawing writes its elements' files again. A drawing can be several
  elements', and one assigned to none is only a drawing. Unassign, on an
  element's tile, takes the element's file away and keeps the drawing.
- **Opening:** a PNG, or an SVG that Sprites saved, which comes back as
  the drawing it was saved from. Any other SVG is turned away. In Chrome,
  the gallery shows every picture in `sprites/art/` and each drawing this
  browser saved or opened elsewhere in the checkout, with Browse for any
  other file. Every picture there is drawn at one size, 2× to 8× from the
  bar, so drawings compare at their true sizes; 2× is Emu's Library.
- **Emu's elements:** under the drawings no element shows, the gallery
  lists Emu's three sets, one element for each of Emu's systems, its file
  named for the system: `emu/brand/consoles/`, which
  `emu/docs/drawing-consoles.md` says how to draw,
  `emu/brand/logos/` and `emu/brand/controllers/`. Each tile is the
  element's drawing, or an empty tile that starts a new drawing assigned to
  it on its first save. The systems are the ones `emu/emulators.json`
  names.

The drawing as it stands is kept in this browser, so a reload loses
nothing, and it stands in the gallery as Not saved until a file holds it. A
tile, Browse and New drawing ask before they replace it. Each tab keeps its
own, so two tabs can hold two drawings; a new tab starts from the one drawn
last.

## Saving into the checkout

In Chrome, Show saved drawings or the first Save asks for the checkout
folder, the one holding `AGENTS.md`, and remembers it; later visits ask
only to allow it again, with that same button. That works on `npm run serve` at :8640, on :8641, and on the public
site. Safari and Firefox can't write into a folder, so Save downloads the
file and says the path it belongs at.

## Files

| | |
| :--- | :--- |
| `index.html` | the page, from Design's header-only shell |
| `app.js` | the gallery and the editor: the tiles, the canvas, the tools, undo, the colours, Size and Save |
| `data.js` | the palettes and presets, the colour spaces, the draft kept in this browser, the paths the gallery remembers, and the elements |
| `files.js` | opening a PNG or an SVG Sprites saved, listing the pictures the gallery shows, the PNG and SVG writers, reading and writing the assignments, and the checkout's folder |
| `palette.json` | Sprites' 122 colours, in ramps |
| `assigned.json` | each element's drawing, by the element's path; Sprites writes it |
| `art/` | every drawing |
| `app.css`, `theme.css`, `overrides.css` | its own components, and Design's two delta files, both empty |
| `brand/` | `icon.svg` for the tile and `favicon.svg` for the tab |

## Check

`npm run check` at the root runs Design's shared check over this page.
