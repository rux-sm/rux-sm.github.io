---
type: plan
---

# Plan: an Apple-style light theme

## Goal

Design gains an eighth theme, `apple-light`: a light theme in the style of
Apple's own apps. Every colour and size in it is read from Apple, as
geist-dark's were read from Geist's pages. It works in every app on the site
and passes Design's contrast gate with no exception.

## Decisions

- **Every number comes from Apple, none from memory.** Colours come from the
  colour tables in Apple's Human Interface Guidelines. Sizes, corners, gaps
  and type come from Apple's own apps on this Mac, measured from screenshots
  at 2x, and from Apple's design kit where a screenshot cannot say.
- **Each value keeps its source.** `design/docs/apple-token-map.md` lists
  every token beside the Apple colour or measurement it came from, as
  `design/docs/geist-token-map.md` does for Geist.
- **It reuses the rounded themes' shapes.** The rules geist-dark and ant-dark
  share in `design/css/rux-overrides.css`, for rounded controls, inset bars and
  footers that hold ordinary buttons, take the new theme's name. Only what
  Apple does differently is written new.
- **The system font, with no file.** The theme names the device's own system
  face, which is San Francisco on a Mac and an iPhone, so it downloads nothing.
- **A trip is an Apple Calendar event.** A pale tint of the trip's colour,
  text in a darker step of it, and a solid bar of it down the leading edge.
- **Solid surfaces.** Cards, menus and panels are opaque. The board is dense,
  and a blurred surface over it costs reading.
- **The contrast gate decides.** Where one of Apple's colours fails the gate
  as text on its surface, the theme takes Apple's own increased-contrast
  variant of that colour.
- **Light only.** A dark companion is its own plan.

## Questions

- **The name.** Is `apple-light`, shown as "Apple light" in the account
  panel, the name you want? The other themes already carry their source's
  name.
- **Which Apple look.** Apple's current look has capsule buttons, larger
  corners and glass. Its earlier look is flatter, with 10px corners. Should
  the theme take the current shapes with solid fills, which is the
  recommendation, or the earlier look?
- **Mac sizes or iPhone sizes.** A Mac's controls are smaller and suit the
  board on a desk. An iPhone's are larger for a thumb. Is it right to take
  Mac sizes on a wide screen and keep each app's own phone layout on a phone?
- **The accent colour.** Should the main button and links be Apple's blue, or
  the company's own blue from the logo?

## Tasks

- [ ] Read the light-mode system colours, greys, fills, separators and label
  colours from the Human Interface Guidelines, with their increased-contrast
  variants, into `design/docs/apple-token-map.md`.
- [ ] Measure Apple's apps on this Mac at 2x into the same document:
  Calendar's week view and an event, Settings, Reminders, a sheet and an
  alert. Record control heights, corners, paddings, gaps, type sizes and
  weights.
- [ ] Add the `apple-light` token block to `design/css/rux-theme.css`, and
  name the theme in `design/js/theme.js`, `design/tools/lib/shell.mjs` and
  the tools that list the themes, then rebuild the pages.
- [ ] Add the theme to the rounded themes' shared rules in
  `design/css/rux-overrides.css`, then write Apple's differences from the
  measurements: fields, the button kinds, the segmented control, the switch,
  checkbox, radio, menu, tooltip, tag and table.
- [ ] Set the system font and Apple's type sizes and weights.
- [ ] Colour the scheduler in `scheduler/theme.css`: the trip bars with their
  leading edge, the three heads, the trip card and the roster.
- [ ] Give every other app's `theme.css` its `apple-light` block where the
  app sets colours by theme.
- [ ] Run Design's contrast gate and the full check, and fix each failure
  with Apple's increased-contrast variant.
- [ ] Check in Chrome on :8641 at desk and phone width against the
  measurements: the board, the trip editor's five tabs, the lists, a pop-up,
  the trip card and Design's kitchen sink.
