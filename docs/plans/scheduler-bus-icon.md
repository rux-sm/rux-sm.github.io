---
type: plan
---

# Plan: each bus drawn in its own paint on the Live map

## Goal

A bus on `scheduler/live.html`, and on the board's live card map, is a small
three-quarter drawing of the coach in its own paint from the Fleet page,
facing the way it drives, sharp at actual and Retina size.

## Decisions

- **Pixel art in a 32 × 32 px square,** room for window panes, the door,
  wheel hubs and rear lights to read clearly; drawn on whole pixels with no
  strokes, gradients or soft edges.
- **Eight directions, picked by heading to the nearest 45°,** never turned
  to an angle, because turning a small drawing blurs it; a stopped bus keeps
  its last direction.
- **Five drawings: up, up-right, right, down-right and down;** the three
  facing left are the mirrors of the right ones.
- **The paint is keyed and recoloured in code** from the bus's `color` in
  `buses`, as the head of `scheduler/live-map.js` says. Glass #1D2733,
  tyres #0B0B0B, hubs #8D8D8D, lights #F4F4F4 and rear lights #DA1E28 stay.
- **The code adds one 1px outline,** light on the dark map and dark on the
  light map, so every paint shows on both and nobody draws it.
- **The number stays in its label beside the bus,** in the trip colour, as
  now, since four buses share near-black paint; warning rings and joined pins
  stay as they are.
- **rux draws the five views in Linearity Curve** from the template in the
  iCloud Drive folder `Bus icon`, one 32px file a view with a starter
  coach in the key colours, and exports each as SVG there.

## Questions

None open.

## Tasks

- [ ] Put rux's five SVGs in `scheduler/brand/` in place of the starter
  coach, `bus-1-up.svg` to `bus-5-down.svg`, checking that the key colours
  in Curve's export are written as hex fills, which `scheduler/live-map.js`
  replaces.
