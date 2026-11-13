---
type: plan
---

# Plan: Sprites, a pixel-art editor that saves into the repository

## Goal

A small app where rux draws icons and sprites a pixel at a time and saves
them straight into this checkout, as PNG or SVG, with no export-and-move
step. Its first use is Emu's consoles: drawn in the console palette, saved
as the PNG `emu/tools/build-consoles.mjs` reads, so the room's drawings are
made here rather than in an outside editor. It stays small: a few tools, a
zoomed grid and saving.

## Decisions

- **It is its own app, `sprites/`, named Sprites,** with the header Rux
  Sprites, the class prefix `sprites-` and the commit scope `sprites`, by
  the Names table. It is a tool rather than a game or a library page:
  Design holds components with invented content and is no place for a tool
  that writes rux's files, and Pixels' Pixelator makes nonogram puzzles on
  square boards with solvability, categories and rifts, which a sprite has
  none of.
- **It is made the way every new app is:** `sprites/index.html` started
  from `design/templates/app-shell.html`, one entry in `switcher.json`
  ("Draw icons and sprites"), an `icon.svg` in `sprites/brand/` drawn by
  `docs/app-icons.md`, a `README.md`, and a row in AGENTS.md's Names
  table. It needs no log-in and no database, so it works the same on :8640,
  :8641 and the public site.
- **A drawing starts from a preset or a free size.** The presets are Emu's
  home console, 36×24; Emu's handheld, 24 high and 1 to 36 wide, 16 to
  start; and an icon, 16×16 or 32×32. Free is any width and height from 1
  to 256. A size change keeps the drawing anchored to the bottom left,
  because a console stands on its bottom row, and Undo takes it back.
- **A project palette has one home, beside the drawings it is for.**
  `PALETTE` moves out of `build-consoles.mjs` into
  `emu/brand/consoles/palette.json`, each colour's property, hex and
  purpose, which the converter reads with `readFileSync` and the editor
  fetches, because a browser cannot import a Node tool. `palette.gpl` and
  `palette.png` stay derived from it by `--template`, for outside editors,
  and `emu/docs/drawing-consoles.md` names the new home.
- **A project is a palette, its presets and its folder,** listed in
  `sprites/data.js`; Emu consoles is the only one: `palette.json`, the home
  and handheld presets, and `emu/brand/consoles/` to save into. Picking it
  shows the palette's twenty swatches, each labelled with its property, and
  nothing else can be drawn with, so a drawing it makes never stops the
  converter.
- **Without a project, Sprites' own palette of 64 colours is open,** made
  for balanced, vibrant pixel art: an 8-step grey and eight colour ramps of
  six (red, orange, yellow, green, teal, blue, purple, pink), with skin and
  brown ramps of four. Every ramp is spaced evenly in OKLCH lightness, its
  shadows lean toward violet or a cooler neighbour and its lights toward
  yellow, and its chroma peaks in the middle steps, so a ramp shades a
  form without going muddy or neon. No two colours are closer than 0.036
  in OKLab, so each reads apart. Its one home is `sprites/palette.json`,
  ramps of hex values by name, and its swatches stand as one row per ramp.
- **A free colour is there beside it:** any opaque colour from a colour
  field, the last eight used kept as swatches, and clear. No pixel is ever
  half clear, so every drawing stays crisp at any scale.
- **The tools are pencil, eraser, fill, picker and mirror, with undo and
  redo.** Fill floods the run of one colour joined edge to edge; the picker
  takes a pixel's colour, also while Alt is held; mirror is a switch that
  repeats the pencil and eraser across the vertical middle. Each stroke,
  fill or resize is one step; Cmd or Ctrl with Z undoes, with Shift redoes,
  a hundred steps back. Keys follow pixel editors': B, E, G, I and M.
- **The grid is drawn at whole pixels.** The canvas is zoomed by a whole
  number, the largest that fits to start and changed with + and −, and its
  backing store is sized in device pixels so each art pixel covers a whole
  number of them. Grid lines show from a zoom of 8 up, and clear pixels show
  a checkerboard; both are `--rux-*` tokens in `sprites/theme.css`.
- **Opening and saving go through Chrome's File System Access API.** The
  first Save or Open asks for the checkout with `showDirectoryPicker`,
  checks `AGENTS.md` and `switcher.json` stand at its root, and keeps the
  handle in IndexedDB, asking again for permission once a visit. Open
  starts in it and reads any PNG; Save writes to a path in it, such as
  `emu/brand/consoles/snes.png`, starting in the project's folder or the
  last one used, and says the path it wrote. Both work on :8640 and :8641,
  which are secure contexts.
- **Other browsers download instead,** Safari and Firefox lacking the
  directory picker: Save downloads the file under its name and says the
  path it belongs at, and Open takes a file from the file picker.
- **A drawing is exported three ways.** PNG at 1×, or scaled 2×, 4× or 8×
  by whole pixels; SVG of one `rect` per run of a colour on a row, with
  `shape-rendering="crispEdges"` and hex fills; and, for a project, the
  converter's PNG: 8-bit RGBA, not interlaced, every pixel a palette hex or
  clear. A console is never saved as SVG by the editor, so
  `build-consoles.mjs` stays the one path into `emu/brand/consoles.svg`, and
  after a save into its folder the page shows the command that runs it.
- **The work in progress is kept as a draft in the browser,** so a reload
  loses nothing, and leaving with unsaved changes asks first.
- **Carbon lays out everything but the canvas.** The header, the tool row
  as icon buttons, the preset and size fields, the save modal and the
  toasts are Design's `rux--*` classes; the canvas, its grid and the
  swatches are the app's own under `sprites-`, every colour a `--rux-*`
  token except the swatches' own, which are the drawing's colours. Zoom and
  tool changes follow Carbon's motion.

- **Sprites keeps its own drawing code.** Whether the Pixelator's board
  moves onto it is decided once Sprites is built and its code can be
  compared.

## Questions

- Does Sprites stand in the switcher for everyone, or is it left out
  because only rux saves with it?
- Should Pixels' 126 inks be a second project palette, for drawing a
  puzzle's picture here?

## Tasks

- [ ] Move `PALETTE` into `emu/brand/consoles/palette.json`, read by
      `build-consoles.mjs`, and update `emu/docs/drawing-consoles.md`.
- [ ] Start `sprites/` from the app-shell template with the design-page
      skill, its `switcher.json` entry, icon, README and Names row.
- [ ] Draw the canvas at whole zoom with its grid and checkerboard, the
      presets and free size, and the draft.
- [ ] Add the pencil, eraser, fill, picker and mirror, undo and redo, and
      their keys.
- [ ] Write `sprites/palette.json` with the 64 colours, and try them by
      drawing a console, an icon and a small character in them.
- [ ] Load a project palette from `sprites/data.js`, and Sprites' palette
      and free colour without one.
- [ ] Open and save in the checkout through the File System Access API,
      with the handle in IndexedDB, and the download fallback.
- [ ] Export PNG at 1× and scaled, SVG of runs, and the converter's PNG,
      and prove it by saving a console and running `build-consoles.mjs` on
      it.
- [ ] Check it in rux's Chrome on :8641 in both themes and at a phone width.
