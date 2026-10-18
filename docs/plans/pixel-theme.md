---
type: plan
---

# Plan: Pixel, a Design theme for the games

## Goal

Design gains a theme, `pixel-dark`, that makes any page built from it look
drawn in pixels: a pixel font, square edges cut and shaded a pixel at a time,
and the dark greys of a paint program, so Pixels looks like the game it is.
It is one of Design's themes like the others, so every component keeps
working and a page needs no change to wear it. Every edge and letter lands
on whole screen pixels, so it is sharp where Aseprite's own look is soft.

## Decisions

What it is:

- **A theme, not a skin for one app.** It is a `[data-theme="pixel-dark"]`
  block of token values in `design/css/rux-theme.css`, rules in
  `design/css/rux-overrides.css` for the shapes, and a font `js/theme.js`
  loads for this theme alone, as it loads Geist for geist-dark. Any Design
  page can wear it, and so can the account panel's theme list.
- **Inspired by Aseprite, not copied.** It borrows the ideas: cool dark
  greys, a raised edge on what is pressed, a sunken edge on what is typed
  in, and one bright highlight for what is chosen. No Aseprite artwork,
  icon or font is used.
- **Its colours come from the Pixels inks.** The greys, the accent and the
  status colours are taken from `pixels/theme.css`, so the page and the
  pictures are one family. The accent is the inks' blue.
- **The page stays quiet and the art is bright,** as
  `docs/plans/game-pages.md` decides: the frame is greys, and colour is for
  pictures, the accent and status.

The pixel look:

- **No round corners and no soft shadows.** Edges are chunky: a 2px black
  outline with its corner pixel cut, and a thick dark lip along the bottom
  of anything raised. A field is a flat dark well with a dark lip at its
  top.
- **Pressed is pushed in:** a button drops 3px into its lip.
- **Focus is a 2px ring of the accent,** square, with no glow.
- **Movement steps.** A change happens in two or three steps, not a smooth
  fade, and with motion turned down it happens at once.
- **The font is Silkscreen, everywhere,** running text too. It is drawn on
  an 8-pixel grid in capitals, so it reads as pixel art; labels are kept
  short because it is wide.

Sharp, not blurry:

- **Everything lands on whole pixels.** Aseprite's look blurs because it
  scales its pixel art by uneven amounts. Here every border, edge and gap is
  a whole CSS pixel, and the font is set only at whole multiples of the size
  it was drawn at: 16px for every word and 32px, exactly double, for a
  heading, so each of its pixels is 2 or 4 CSS pixels and a whole number of
  screen pixels on every screen. A sprite is drawn at the same 2 CSS pixels
  a pixel, or 4 for a big one, so words and art are one drawing. Where a
  word does not fit at 16px on a phone, its key shows its icon alone.
- **The font is one drawn on a pixel grid,** with an open licence so it can
  be kept in `design/assets/fonts/` beside Plex and Geist.
- **Dark only.** A light version waits until the dark one is in use.

Pixels:

- **Pixels is locked to `pixel-dark`.** Every Pixels page wears it whatever
  theme the player keeps elsewhere, and Theme leaves Me's list.
- **Pixels never writes the saved theme.** It is kept with the account and
  shared by every app, so Pixels sets the theme on its own pages only.
- **Pictures already draw sharp,** with `image-rendering: pixelated`; the
  theme does not change them.

## Questions

None open.

## Tasks

- [ ] Look at Pixels' signed-in pages at 390px wide now every word is
      16px: a rift's tile, the map's labels, a puzzle's name, the
      Pixelator's corner check, and long names that Silkscreen's width may
      cut.
- [ ] Measure contrast across the kitchen sink and every template in
      pixel-dark in Chrome on :8641, which needs the log-in.
- [ ] Look at a signed-in Pixels page in the iPhone simulator at 3× for
      blur.
- [ ] Put the icons rux draws in `pixels/art/source/icons.aseprite` into
      Pixels in place of Carbon's, each drawn at 2px a pixel in the words'
      colour, through `pixels/tools/build-art.mjs`.
