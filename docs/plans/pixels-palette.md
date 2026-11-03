---
type: plan
---

# Plan: A full palette for Pixels

## Goal

A palette to draw any picture with, in Pixels' bright, saturated look:
every colour has the same seven shades, from nearly white to nearly black,
and its shadows and lights stay colourful. Every picture already drawn
keeps working and takes the new colours on its own.

## Decisions

- **126 inks: 17 colours and the greys, seven shades each.** The colours
  are red, orange, gold, yellow, lime, green, sea green, teal, sky blue,
  blue, indigo, purple, pink, brown, skin, olive and slate. The shades are
  palest, pale, light, base, deep, dark and darkest.
- **Today's twelve base colours keep their exact colour,** and so do
  today's five greys, because the bright look and the pixel-dark theme are
  built on them. Gold, lime, sea green, indigo, olive and slate are new.
- **One rule draws every shade from its base.** Lightness steps evenly
  away from the base, shadows turn toward blue-purple and lights toward
  yellow, the short way round the colour wheel, and the colour stays
  strong, so no deep shade turns muddy or olive.
- **The rule's numbers, in OKLCH, are the ones drawn for rux:** lights
  step to 0.955 by thirds, shadows step toward 0.17 by 30, 58 and 82%,
  chroma is 38, 62, 84, 100, 95, 80 and 62% of the base's, and the hue
  turns 12, 8, 4, 0, 8, 16 and 24 degrees (gold's and yellow's shadows 14,
  26 and 36). The new bases are gold 0.80 0.17 80, lime 0.80 0.20 125, sea
  green 0.68 0.15 165, indigo 0.50 0.22 277, olive 0.60 0.10 110 and slate
  0.58 0.05 255, and the greys are white, `#dbdee6`, `#b3b6c2`, `#888b99`,
  `#66697a`, `#444658` and `#151423`.
- **A square stays one character.** The 62 characters grow to 126 with the
  64 letters from Ā to Ŀ, because every part of Pixels reads one character
  a square and no saved picture then changes length.
- **Today's 60 characters keep their place.** Each becomes the new shade
  nearest it in its own colour, no two the same, so every puzzle, player
  picture and helmet reads as it did, in the retuned colours, with nothing
  rewritten. The 66 new inks take Y, Z and the new letters.
- **One table holds the inks,** a character, a name and a colour each, and
  a tool writes `pixels/theme.css`'s inks, the maker's list and
  `pixels/art/source/pixels.gpl` from it. The board sets a square's colour
  from its character, so `pixels/app.css` loses its 60 ink rules.
- **A colour is picked in two taps:** a row of the 18 colours, then the
  chosen colour's seven shades under it, all on one screen, because 18
  columns of every shade are too small to tap at phone width. The shade
  last picked in each colour is kept, so a colour already in use is one tap.
- **The database takes the new letters by one change to its two checks,**
  on `pixels_puzzles.colours` and `pixels_players.picture_colours`, applied
  on rux's yes before the site that writes them is pushed.

## Questions

- **Are these 17 colours the right ones,** as the picture of the palette
  shows them, or should any be swapped for another?

## Tasks

- [ ] Write `pixels/tools/build-inks.mjs`: the 18 bases and the shading rule
  in, `theme.css`'s inks, the maker's list and the `.gpl` out; the check
  fails where they differ from the table.
- [ ] Grow `CHARS` in `pixels/app.js` to 126, set `--ink` from the character
  wherever a square is painted, and drop the 60 rules from `app.css`.
- [ ] Lay out the maker's inks as a row of colours and a row of the
  chosen colour's shades.
- [ ] Show rux the SQL that widens the two checks, and apply it on a yes.
- [ ] Correct the inks' description in `pixels/README.md`,
  `pixels/docs/making-puzzles.md` and `pixels/docs/drawing-the-art.md`.
- [ ] Check in Chrome on :8641: an old puzzle shows its retuned colours, a
  puzzle painted with a new ink saves, plays and finishes in it, a player
  picture and the helmet still draw, and a page reloaded offline shows the
  same.
