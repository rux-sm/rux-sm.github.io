# Sprites

A pixel-art editor for icons and sprites that saves straight into this
checkout. It's one app on [design](../design/), served at
**rux-sm.github.io/sprites/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md`
lists what is unfinished here.

## What it is

`index.html` is the whole app: the drawing on a stage at a whole zoom, the
tools above it and the colours beside it.

- **Tools:** pencil, eraser, fill and picker, with mirror, undo and redo,
  and zoom. The keys are B, E, G, I, M, + and −, 0 to fit, Cmd Z and
  Shift Cmd Z, and Cmd S to save. Holding Alt picks a colour with any tool.
- **Size:** presets for an Emu home console, 36 × 24, an Emu handheld, 24
  high and up to 36 wide, and icons at 16 and 32, or any size up to 256.
  Resize keeps the drawing anchored to its bottom left.
- **Palettes:** Sprites' own 70 colours, in `palette.json`, with any colour
  beside them; or Emu consoles, which is only the twenty colours in
  `emu/brand/consoles/palette.json`.
- **Saving:** a path in the checkout and a format: PNG at 1×, 2×, 4× or
  8×, or SVG. Emu consoles saves only the 1× PNG that
  `emu/tools/build-consoles.mjs` turns into `emu/brand/consoles.svg`, so
  `emu/docs/drawing-consoles.md` is how a console is drawn.

The drawing as it stands is kept in this browser, so a reload loses
nothing.

## Saving into the checkout

In Chrome, the first Open or Save asks for the checkout folder, the one
holding `AGENTS.md`, and remembers it; later visits ask only to allow it
again. That works on `npm run serve` at :8640, on :8641, and on the public
site. Safari and Firefox can't write into a folder, so Save downloads the
file and says the path it belongs at.

## Files

| | |
| :--- | :--- |
| `index.html` | the page, from Design's header-only shell |
| `app.js` | the editor: the canvas, the tools, undo, the colours, Size and Save |
| `data.js` | the palettes and presets, and the draft kept in this browser |
| `files.js` | opening a PNG, the PNG and SVG writers, and the checkout's folder |
| `palette.json` | Sprites' 70 colours, in ramps |
| `app.css`, `theme.css`, `overrides.css` | its own components, and Design's two delta files, both empty |
| `brand/` | `icon.svg` for the tile and `favicon.svg` for the tab |

## Check

`npm run check` at the root runs Design's shared check over this page.
