---
type: plan
---

# Plan: Rux dark, the official Rux look

## Goal

Design has one theme that looks like Rux and like no other system: `rux-dark`.
Carbon stays the structure under it, as under every theme here, but its colours,
corners and face are chosen for Rux, starting from the mark: a one-colour
dachshund drawn in whole squares on a 16 grid, in Carbon's gray 10 and gray 100.
It works in every app on the site, and Design's contrast measurement reads no
text in it under 4.5 to 1 and no control's resting shape under 3 to 1.

## Decisions

- **Its colours, corners, face and field ring are its own; its other shapes
  are geist-dark's.** The 64px header, the ringed buttons, the menus held off
  their edge and the segmented control stay shared until a Rux shape replaces
  one, and nothing new is taken from Geist or Primer.
- **The ink is the mark's `#f4f4f4`.** The words, the icons, the main button,
  the brand fill and the mark are one colour, so the logo and the page agree.
- **The main button stays that one ink on black,** because the mark is one
  colour; the accent is spent on links, selection and state, never on the
  primary action.
- **The colours are vivid.** Every hue -- red 25, orange 50, amber 75, yellow
  95, green 150, teal 185, cyan 225, blue 262, purple 300 and magenta 350, in
  OKLCH degrees -- takes the same steps of lightness, each at the most chroma
  its hue holds there, so no colour shouts louder than another: a tint at 0.28
  (0.32 on hover) behind an ink at 0.75 (0.82 for amber and yellow, 0.82 on
  hover), and a fill at the lightest step that still holds white at 4.5 to 1,
  0.535 to 0.59 by hue. Every ink sits on the one step, the accent's too, so
  the set reads as one family. One palette serves every use: a tag, a trip bar, a
  status dot, a support colour, error text, the danger button, an avatar, and
  Carbon's guide banner and coachmark, whose blue and purple become its own.
- **The colours use the wider Display P3 range,** written in OKLCH, so a Mac
  or an iPhone shows them at their full strength and an ordinary screen shows
  the nearest colour it has; each pairing holds its contrast on both.
- **The accent is the palette's blue,** and it carries every accent token: the
  links, info, the on toggle, the inverse focus, the highlight, the blue tag,
  the notification actions, the chat's button and the `ai-*` tokens.
- **A big surface stays calm.** A notification's fill is its ink at 15% over
  the page, under the vivid ink, because a whole box at full strength tires
  the eye where a tag or a bar does not.
- **The greys are half-cool.** Each keeps the OKLCH lightness of the neutral
  ladder whose first raised surface is `#111111` and takes Carbon cool gray's
  hue, 248, at half its chroma. The page stays `#000000`, and a grey tag stands
  a step above the surfaces, because it has no hue to part it from them.
- **Corners follow the mark's squares, in two steps.** 4px on a control and a
  tag: a button, a field, a dropdown, a search, a date field and a checkbox,
  and the tag because a corner reads rounder on a smaller thing. 8px on a
  surface: a tile, a menu, a popover, a tooltip, a notification, a toast, a
  calendar, a modal, a switcher's box and a side panel's free corners. 0 where
  a box meets the window's edge or another box it is joined to. Round only
  where the roundness is the meaning: the account picture, a radio, a toggle
  and a status dot. Nothing is rounder than 8px.
- **A control held close to a surface's edge stands 4px in,** a menu's item, a
  switcher's option and a scheduler shortcut, so its 4px corner runs parallel
  to the surface's 8px; a control well clear of the edge needs no such care.
- **The face is IBM Plex Sans,** with Plex Mono for code, as Carbon's own
  themes wear it, because Carbon's type scale is drawn for it.
- **A field and every ringed button ring in `border-strong-01`,** 3 to 1 or
  better on what they stand on, and a box keeps the quieter `border-subtle`
  line, because a control's edge is part of its shape and a box's is not.
- **A button is ringed where it stands clear.** The header's buttons, the
  buttons in a scheduler panel's head and every close button Design has take
  the button's border; each X stands clear of its corner to take it, and on a
  coloured or inverse surface the ring is that surface's ink at 30%. On a phone
  the scheduler's panel heads keep Carbon's bare squares.
- **The account button is the face.** The picture is 32px in every theme, so it
  fills this theme's 32px header button and takes no ring.
- **A colour is changed in its own block; a shape is written for rux-dark
  alone.** A rule left with nothing rux-dark shares loses its name, and a
  corner it changes in a rule it still shares otherwise is written for it
  right after that rule, so geist-dark never moves and the cascade keeps its
  order.
- **It is named `rux-dark`, and it is in the account panel** as "Rux dark"
  while it is built, so rux picks it on any page to see where it stands.
- **There is no light companion in this plan.** `rux-light` would be its own.
- **Every number is measured, none remembered.** A Carbon colour is read from
  `@carbon/colors` in `design/node_modules`, and a value chosen for Rux is
  measured on every layer it sits on before it is written, at full P3 strength
  and as an ordinary screen shows it; `design/docs/rux-dark-token-map.md` lists
  each one and its source.

## Questions

- **How dark is the Unassigned row?** It darkens in every theme with black
  laid over the board, its "No bus" label taking the primary text so it still
  reads. 40% is the most every theme's label holds, 5.2 to 1 in apple-light,
  and reads as a heavy grey band in the light themes; 25% is lighter there.
  In the near-black themes either leaves it barely darker than a bus row,
  with its bars as clear of it as of any row.

## Tasks

- [ ] Part the scheduler's Unassigned row from a trip bar by more than its
  hue, in every theme. Its track is `layer-hover-01`, at about the lightness
  of a bar's fill, so a bar on it measures 1.02 to 1.62 to 1 against it across
  the ten themes and 1.03 in rux-dark.
