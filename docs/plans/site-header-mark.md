---
type: plan
---

# Plan: a dark drawing of the mark, for a light bar

## Goal

The mark in the top bar reads whatever the bar is. The bar takes a custom
theme now, and the dachshund is drawn in `#f4f4f4` for a dark one, so a light
theme built in the Theme Creator leaves it almost invisible. A second drawing
of the same mark in dark ink, and the bar picks the one that reads.

## Decisions

- **A second file, not a filter.** `brand/logo-dark.svg` beside
  `brand/logo.svg`, the same geometry with a dark fill. A CSS `invert()` over
  the header would turn the scheduler's client logo orange, and painting one
  file in the bar's own text colour means a mask, which means replacing the
  `<img>` in all 60 places it is written.
- **The geometry is copied, not redrawn.** One drawing, two fills, so a change
  to the mark stays one change.
- **Three copies stay three copies.** `logo.svg` is byte-identical in the
  root, Design's and Notes' `brand/` folders today; the alternate follows that,
  and no sync tool is added for two files.
- **`js/theme.js` picks it.** It already dresses the bar and is the only thing
  that knows what colour the bar ended up, which for a saved theme is not
  knowable from the theme's name.
- **It picks by measuring, not by a list.** It reads the bar's computed
  background, works out the contrast of each fill against it, and takes the
  higher. No threshold to tune and no enumeration of which themes are light.
- **Only `logo.svg` is swapped.** The scheduler's `logo.png` is the client's
  own artwork, one file, and is left exactly as it is.
- **The swap happens where the bar is dressed,** in the same pass before first
  paint, so there is no flash of the wrong mark.

## Questions

- **One alternate, or two?** A single dark mark at Carbon's `#161616` is the
  mirror of today's `#f4f4f4`. Two — a black and a grey — would need a rule
  for which bar gets which.
- **The scheduler's bar.** Its logo is the client's picture file, and its white
  sub-line will disappear on a light bar. Leave it, or ask the client for a
  dark version?

## Tasks

- [ ] rux answers the two questions above.
- [ ] Draw the alternate and put it in the root, Design's and Notes' `brand/`.
- [ ] Teach `design/js/theme.js` to pick between the two.
- [ ] Correct the sentences that say the mark is one file:
      `notes/tools/build.mjs`'s header comment and `design/tools/lib/shell.mjs`.
- [ ] rux checks the bar on Home, Design, Notes and the scheduler in every
      theme, including a light one built in the Theme Creator.
