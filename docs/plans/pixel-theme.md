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

- **No round corners and no soft shadows.** A raised thing has a 1px light
  edge on its top and left and a 1px dark edge on its bottom and right; a
  sunken field the reverse. A box's corner is cut by one pixel, as a pixel
  drawing's would be.
- **Pressed is pushed in:** a button's edges swap and its face drops 1px.
- **Focus is a 2px ring of the accent,** square, with no glow.
- **Movement steps.** A change happens in two or three steps, not a smooth
  fade, and with motion turned down it happens at once.
- **Running text stays readable.** A pixel font is for what is short, and
  longer text keeps a plain font, if the question below is answered so.

Sharp, not blurry:

- **Everything lands on whole pixels.** Aseprite's look blurs because it
  scales its pixel art by uneven amounts. Here every border, edge and gap is
  a whole CSS pixel, and the font is set only at whole multiples of the size
  it was drawn at, so on a phone each of its pixels is exactly 3 screen
  pixels.
- **The font is one drawn on a pixel grid,** with an open licence so it can
  be kept in `design/assets/fonts/` beside Plex and Geist.
- **Pictures already draw sharp,** with `image-rendering: pixelated`; the
  theme does not change them.

## Questions

1. Should the pixel font be used for everything, or only for headings,
   buttons, tabs and labels, with a plain font for longer text? The second
   is easier to read; the first looks more like a game.
2. Should Pixels open in this theme for every player, with the theme list
   still able to change it, or only for someone who picks it?
3. Dark only for now, or a light version too?

## Tasks

- [ ] Build a page in Design with invented content showing three pixel
      fonts and two edge styles on a button, a field, a tile, tabs and a
      modal, at phone width; screenshot it for rux to pick from.
- [ ] Add the chosen font to `design/assets/fonts/` with its licence, and
      load it in `js/theme.js` for `pixel-dark` alone.
- [ ] Write the `pixel-dark` token block from the Pixels inks, and its token
      map in `design/docs/`, as `rux-dark-token-map.md` is for rux-dark.
- [ ] Write the edges, the pressed state, focus and stepped movement in
      `rux-overrides.css`, and the same for the `game-` parts in
      `design/css/rux-game.css`.
- [ ] Add `pixel-dark` to every list of themes: `js/theme.js`, the account
      panel, the Theme Creator and the checks that walk every theme.
- [ ] Measure that every text and control colour meets contrast, and that
      the font and edges land on whole pixels at 1×, 2× and 3×, in Chrome
      and in the iPhone simulator.
- [ ] Wear it in Pixels, by the answer to question 2.
