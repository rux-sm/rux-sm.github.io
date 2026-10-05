---
type: plan
---

# Plan: an Apple-style light theme

## Goal

Design gains an eighth theme, `apple-light`: a light theme in the style of
Apple's own apps. Every colour and size in it is read from Apple, as
geist-dark's were read from Geist's pages. It works in every app on the site,
and Design's contrast measurement reads no text in it under 4.5 to 1.

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
  text in a darker step of it, and Calendar's strip of it inside the leading
  edge.
- **Solid surfaces.** Cards, menus and panels are opaque. The board is dense,
  and a blurred surface over it costs reading.
- **Contrast decides.** Where one of Apple's colours makes less than 4.5 to 1
  as text on its surface, the theme takes Apple's own increased-contrast
  variant of that colour.
- **It stays out of the account panel until it is whole.** `js/theme.js`
  knows the name, so a session can put it on a page, and nobody can pick it
  half built.
- **The header bar and a notification keep the rounded themes' shapes.**
  Apple has no banner like either, and both already take this theme's
  colours.
- **Light only.** A dark companion is its own plan.
- **It is named `apple-light`,** shown as "Apple light" in the account panel.
- **Apple's current shapes, with solid fills.** Capsule buttons and the
  larger corners of Apple's current look, without its glass.
- **Mac sizes on a wide screen.** A phone keeps each app's own phone layout.
- **The accent is Apple's blue,** for the main button and for links.
- **Text keeps the site's 14px.** Apple's 13px body would turn every size
  measured from the root into a fraction of a pixel.

## Questions

None open.

## Tasks

- [ ] List the theme in the account panel through
  `design/tools/lib/shell.mjs`, `design/tools/build-builder.mjs` and
  `design/tools/build-readme.mjs`, and rebuild the pages.
