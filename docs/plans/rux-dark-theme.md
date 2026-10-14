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
- **The accent is slate,** Carbon blue's hue, 262, at about half its chroma,
  and it carries every accent token: the links, info, the on toggle, the
  inverse focus, the highlight, the blue tag, the notification actions, the
  chat's button and the `ai-*` tokens.
- **The greys are half-cool.** Each keeps the OKLCH lightness of the neutral
  ladder whose first raised surface is `#111111` and takes Carbon cool gray's
  hue, 248, at half its chroma. The page stays `#000000`.
- **Every hue sits on slate's steps.** A tag of any hue takes slate's lightness
  and chroma, and what must be seen -- the support colours, the status dots,
  the error text and the danger button -- takes the same lightness with more
  chroma, so success is one green on a screen.
- **Corners follow the mark's squares, in two steps.** 3px on a control and a
  tag: a button, a field, a dropdown, a search, a date field and a checkbox,
  and the tag because a corner reads rounder on a smaller thing. 6px on a
  surface: a tile, a menu, a popover, a tooltip, a notification, a toast, a
  calendar, a modal, a switcher's box and a side panel's free corners. 0 where
  a box meets the window's edge or another box it is joined to. Round only
  where the roundness is the meaning: the account picture, a radio, a toggle
  and a status dot. Nothing is rounder than 6px.
- **A control held close to a surface's edge stands 3px in,** a menu's item, a
  switcher's option and a scheduler shortcut, so its 3px corner runs parallel
  to the surface's 6px; a control well clear of the edge needs no such care.
- **The face is IBM Plex Sans,** with Plex Mono for code, as Carbon's own
  themes wear it, because Carbon's type scale is drawn for it.
- **A field rings in `border-strong-01`, at 3 to 1 on the field,** and a box
  keeps the quieter `border-subtle` line, because a field's edge is a
  control's and a box's is not.
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
  measured on every layer it sits on before it is written;
  `design/docs/rux-dark-token-map.md` lists each one and its source.

## Questions

None open.

## Tasks

- [ ] Give the scheduler's trip bars, marks and panels their own pass. Its
  bars, their marks, the roster's busy and day-off cells and an update's age
  colours are still Geist's subtle badge, in the rules `scheduler/theme.css`
  shares with geist-dark; dropping rux-dark from them hands the bars to the
  tag tints, which are slate's steps, and the marks then need measuring on
  those. The No bus row has to stand apart from a bar's fill by more than its
  hue.
- [ ] Measure contrast on each app's front page with
  `design/tools/measure-contrast.js`, in rux's Chrome, where the log-in
  passes.
