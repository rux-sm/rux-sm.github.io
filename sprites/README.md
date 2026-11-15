# Sprites

A pixel-art editor for icons and sprites that saves straight into this
checkout. It's one app on [design](../design/), served at
**rux-sm.github.io/sprites/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md`
lists what is unfinished here.

## What it is

`index.html` is the whole app, in two views. It opens on the gallery: a
New drawing tile, then a tile for every saved drawing. A tile opens the
editor: the drawing on a stage at a whole zoom, the tools above it and the
colours beside it, with Gallery to go back.

- **Tools:** pencil, eraser, fill and picker, with mirror, undo and redo,
  and zoom. The keys are B, E, G, I, M, + and −, 0 to fit, Cmd Z and
  Shift Cmd Z, and Cmd S to save. Holding Alt picks a colour with any tool.
- **Size:** presets for an Emu home console, 36 × 24, an Emu handheld, 24
  high and up to 36 wide, and icons at 16 and 32, or any size up to 256.
  Resize keeps the drawing anchored to its bottom left.
- **Palettes:** Sprites' own 94 colours, in `palette.json`, with any colour
  beside them; Sprites P3, the same 94 made more vivid for a Display P3
  screen and worked out from `palette.json` as the page loads; or Emu
  consoles, which is only the twenty colours in
  `emu/brand/consoles/palette.json`. Switching carries each colour to the
  one of the same name, so a drawing moves between Sprites and Sprites P3
  and back unchanged.
- **Saving:** a path in the checkout and a format: PNG at 1×, 2×, 4× or
  8×, or SVG. A new drawing's path starts in `sprites/art/`, the home of a
  drawing no app has claimed yet; one an app uses is saved where that app
  reads it. A Sprites P3 PNG carries a Display P3 profile, which Open
  reads to open it in Sprites P3 again; its SVG paints each colour in P3
  over an sRGB fill. Emu consoles saves only the 1× PNG that
  `emu/tools/build-consoles.mjs` turns into `emu/brand/consoles.svg`, so
  `emu/docs/drawing-consoles.md` is how a console is drawn.
- **Opening:** a PNG, or an SVG that Sprites saved, which comes back as
  the drawing it was saved from. Any other SVG is turned away. In Chrome,
  the gallery shows every picture in `sprites/art/` and Emu's consoles
  folder, and each drawing this browser saved or opened elsewhere in the
  checkout, with Browse for any other file.

The drawing as it stands is kept in this browser, so a reload loses
nothing, and it stands in the gallery as Not saved until a file holds it. A
tile, Browse and New drawing ask before they replace it.

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
| `data.js` | the palettes and presets, the colour spaces, the draft kept in this browser, and the paths the gallery remembers |
| `files.js` | opening a PNG or an SVG Sprites saved, listing the pictures the gallery shows, the PNG and SVG writers, and the checkout's folder |
| `palette.json` | Sprites' 94 colours, in ramps |
| `app.css`, `theme.css`, `overrides.css` | its own components, and Design's two delta files, both empty |
| `brand/` | `icon.svg` for the tile and `favicon.svg` for the tab |

## Check

`npm run check` at the root runs Design's shared check over this page.
