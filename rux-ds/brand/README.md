# brand/

**THREE FILES, AND THIS FOLDER IS THE WHOLE BRAND OF AN APP.** Every project
on rux-ds carries its own `brand/`, seeded once by `tools/new-project.sh` and
never overwritten by a pin move or a rebuild. Swap a file and the project
follows it on reload. Nothing else anywhere needs editing.

| file | where it shows | how it is coloured |
|---|---|---|
| `logo.svg` | the header of every page, as an `<img>` | baked into the file. The header is `#161616` in all four themes, so one colourway serves |
| `favicon.svg` | the browser tab | inside the file, by a `prefers-color-scheme` block. A favicon gets no CSS from the page |
| `icon.svg` | the 32px tile on Rux Home, named in the hub's `switcher.json` by absolute path | not at all. The tile masks it over its own text colour, so the file's colours are discarded and only its alpha is read |

**Which are drawn and which are derived, in this repository.** `logo.svg` is
the drawing a person edits. `favicon.svg` is a second drawing, hand-kept
identical to it. `icon.svg` is GENERATED from `logo.svg` by
`tools/make-marks.mjs` — swap the logo, run `npm run marks`, and the tile
follows. **A consumer app has none of that**: it holds three plain files and
swaps whichever it likes by hand, because `make-marks.mjs` is rux-ds's and is
not vendored.

**`assets/brand/` is a different thing and is not swappable.** It holds the
two generated launcher icons in fixed colourways, rux-ds's own. `brand/` is
what a project owns and replaces; `assets/brand/` is output.

**Adding or changing anything in this folder ages every browser-gate reading**,
by design: `brand` is a declared shared input in `tools/lib/gates.mjs`, whole
directory, added 2026-09-05 after a mark swap aged nothing. It buys no new
detection — no gate here reads the mark — and what it buys is a ledger that
stops calling a reading current for a page whose header has changed. Expect
`npm run gates` to want a re-sweep after touching this folder.

---

**`logo.svg` is the logo. Swap the file; nothing else changes.**

Every page in this repository embeds it the same way, with no class and no
build step between the file and the page:

```html
<img src="brand/logo.svg" alt="" style="height:1.5rem;width:auto;margin-right:.5rem;flex:none">
```

Replace `logo.svg` and every shell in that project picks it up on reload.
Other repositories hold their own copy; changing this one does not update them.

The official mark is the **dachshund**, drawn by rux on 2026-09-07 and
superseding rux-logo-16x16.svg of 2026-09-06, which had superseded Brand.svg.
It was revised four times that day; this is the current drawing, and
`favicon.svg` carries it byte for byte, so the header, the tab strip and the
app icons are one mark. `rux-ds/brand/logo.svg` is the master; Rux Apps, Rux
Notes and Rux Scheduler carry byte-identical copies, confirmed by hashing the
files their live sites serve.

Its 16x16 viewBox contains 114 filled grid cells, bounds x=1..15 and y=1..15:
**one cell of air on every side**, so the mark is square. The 16 columns go
tail 1, back 2, ear 2, ear gap 1, head 5, muzzle 3, with a column spare on
each edge. The tail rises four rows above the back and stops level with the
top of the muzzle, so the head owns the highest point.

**The air is what the app icons need, and it was measured rather than
assumed.** The revision before this one filled all 16 columns. Against the
masks a launcher actually applies, that drawing lost 3 filled cells to a
circular mask (the tail tip, the muzzle tip, and one more), 0 to an iOS
superellipse and 8 to the 28-of-32 safe area. This drawing loses **none under
any of the three**. The padding also costs nothing at fractional sizes and
gains there: 85 partly transparent pixels at 20px and 72 at 24px, against 88
and 93 for the wider mark, and none at 16, 32, 48 or 64.

**The legs and the tail are one cell wide, chosen with the cost measured.**
An earlier revision used two-cell legs. rux preferred the finer ones and kept
them after seeing the numbers, which are recorded here rather than lost:
measured in Chrome across the two leg rows, at 16 CSS pixels the row is 4
solid device pixels alternating with single gaps against 8 for two-cell legs,
and at 20 pixels it is 2 solid and 14 partly transparent, which reads as a
grey band. The mark carries 17 one-cell-wide strokes. If a future reader finds
the legs indistinct at a fractional size, this is why, and it is not a
regression to fix silently.

The file is one `<path>` of three closed loops: the boundary of the filled
region rather than abutting rectangles, because abutting rectangles
anti-alias their shared edges at fractional scales. It uses the default
nonzero fill rule; the outer loop winds clockwise and the two counters
anticlockwise.

## What the file has to be

- **Sized by height.** The `<img>` sets `height:1.5rem` and lets the width
  follow, so the file's own aspect ratio governs. A square logo lands 24x24.
- **Its own colours, baked in.** `currentColor` does not reach into an `<img>`.
  That costs nothing here: the shell header is `#161616` with `#f4f4f4` text in
  all four themes, measured, so one colourway serves every theme.
- **Keep the 16x16 grid.** At 16, 32, 48, 64, 128, 256, 512 and 1024 pixels,
  each cell occupies whole pixels. At 24 CSS pixels each cell is 1.5 device
  pixels on a 1x display (some antialiasing) and 3 on a 2x display (aligned).
  Browser zoom and fractional positioning can also affect alignment.
  Earlier guidance here prescribed an 8x8 grid; that would require redrawing
  this mark and is not the adopted design.
- **A scalable master.** Keep the square viewBox and omit point dimensions.
  Size the SVG at its use site; export raster versions at the final required
  resolution. Do not enlarge a small PNG for a larger logo.

## favicon.svg, beside it

`favicon.svg` is the favicon's OWN drawing, and the same rule applies: swap
the file and every page picks it up on reload, since every page links it as
`<link rel="icon" href="brand/favicon.svg">`. It is here rather than in
`assets/` for the same reason as the logo: a project owns it and may replace
it.

Since 2026-09-07 it is no longer generated from `logo.svg`. It is still a
separate file a person edits, and `tools/make-marks.mjs` holds neither
drawing — but the two files carry the SAME geometry, byte for byte, because
rux chose one mark for every place. They can diverge the moment either is
swapped; **nothing enforces the match and no gate compares them.**

Three earlier versions of this section described drawings that lasted hours:
a 159-cell edge-to-edge mark, a 139-cell dachshund with two-cell legs, and a
124-cell one with fine legs that still bled to the left and right edges. All
were superseded the same day by the 114-cell drawing above, which is the
first since 2026-09-06 to keep a safe area.

## App tile icons

**One monochrome silhouette per app, 32px in the grid on Rux Home.** An app
names its own file in the hub's `switcher.json` — `"icon": "/rux-ds/brand/icon.svg"`,
an absolute path to a file that app serves — and until it does, the tile draws
a filled 32px swatch holding exactly that space. Adding one moves nothing else
on the page.

**The file's own colours are IGNORED, and that is the whole design.** The tile
uses it as a CSS mask over the tile's text colour, so the theme colours it:
gray-100 on the white and g10 tiles, gray-10 on g90 and g100. This is the
opposite case from `logo.svg` above, which is an `<img>` and must bake its
colour in — the header is `#161616` in all four themes, so one colourway
serves; a tile is `#f4f4f4` in two themes and `#262626` in the other two, so a
baked colourway would be wrong in half of them. Decided and proved on
2026-09-07 by masking `logo.svg` into a tile and reading both themes.

What that means when drawing: **everything opaque becomes ink and everything
transparent becomes nothing.** A white shape you drew to punch a hole will
render as ink, not as a hole. Counters must be real holes in the path — the
mark's eyes and ear gap are exactly that.

### The spec

- **16x16 viewBox, integer coordinates, one cell of air on every side.** Live
  area 14x14, the same as `logo.svg`, so a mark and an icon read as one family.
  At the 32px tile slot each cell is 2 device pixels on a 1x display and 4 on
  a 2x — whole pixels, no seams.
- **One `<path>` of closed loops**, not abutting rectangles: rectangles that
  share an edge anti-alias it at fractional scales. Nonzero fill rule, outer
  loop one way and counters the other.
- **Minimum feature one cell; use two for anything that must survive 24px.**
  Measured on the mark's own legs: at 20 CSS pixels a one-cell row is 2 solid
  device pixels against 14 partly transparent, which reads as a grey band. The
  tile is 32px today, where one cell holds up; a launcher or a favicon is not.
- **No strokes, no gradients, no text, no `width`/`height` attributes.**
  Convert strokes to outlines before exporting; keep the square viewBox and
  size it at the use site.
- **No `--` inside an XML comment.** Such a file serves 200 and renders 0x0,
  invisible in a network tab and in the markup. It has cost this project two
  rounds; `tools/make-marks.mjs` refuses to write one.

### Where to draw it

`.brand/` (gitignored working material) holds the grid templates, regenerated
by `node .brand/make-template.mjs`:

    node .brand/make-template.mjs                    # rux-template-32u.svg, the logo master
    UNIT=64 MARGIN=1 node .brand/make-template.mjs   # rux-template-16u.svg, an app tile icon

Both are a 1024px canvas with the grid, the golden sections, Fibonacci circles
and the safe area drawn on it — 28 of 32 units on the master, 14 of 16 on the
icon template. Draw on the template, export the silhouette alone, and check it
in place: put the file in that app's `brand/`, add the `icon` key, and open Rux
Home in a light theme and a dark one. It has to read at 32px without becoming
a blob, and it will be the only coloured-by-theme mark on the page.

## What is NOT here

`assets/brand/` holds two scalable app icons: `icon-light.svg` is dark ink for
light surfaces, and `icon-dark.svg` is light ink for dark surfaces. Both copy
the master's geometry verbatim. Same caveat: they follow a swap only when you
re-run. Platform-specific launcher masks or opaque backgrounds may need
separate packaging; these transparent SVGs are not universal store uploads.

`.brand/` is gitignored working material -- the drawing template, a drop folder
and a preview harness. Nothing there ships.

## Consumers

`tools/new-project.sh` seeds `brand/logo.svg` into a new project only if it is
absent, the same rule `rux-theme.css` and `rux-overrides.css` follow. A pin move
never overwrites a logo you have replaced.
