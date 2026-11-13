---
type: plan
---

# Plan: Sprites, a pixel-art editor that saves into the repository

## Goal

Sprites, at `/sprites/`, is where rux draws icons and sprites a pixel at a
time and saves them straight into this checkout; `sprites/README.md` says
what it does. What is left is proving its palette on real drawings and
deciding whether Pixels' inks join it.

## Decisions

- **Sprites' 64 colours are kept only if they draw well.** Each ramp is
  spaced evenly in OKLCH lightness, its shadows lean toward violet or a
  cooler neighbour and its lights toward yellow, and its chroma peaks in the
  middle, so a ramp shades a form without going muddy or neon; no two
  colours are closer than 0.036 in OKLab. A ramp that falls short on a real
  drawing is changed in `sprites/palette.json`, its one home.
- **Sprites keeps its own drawing code.** Whether the Pixelator's board
  moves onto it is decided once both can be compared.
- **Sprites stands in the switcher like every app,** and the page lock opens
  it only to an account with Sprites ticked, so it is rux's until another
  account is given it.

## Questions

- Should Pixels' 126 inks be a second palette in Sprites, for drawing a
  puzzle's picture here?

## Tasks

- [ ] Draw a console, an icon and a small character in Sprites' 64 colours,
      and change any ramp that falls short.
