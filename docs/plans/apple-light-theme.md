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
  text in a darker step of it, and a solid bar of it down the leading edge.
- **Solid surfaces.** Cards, menus and panels are opaque. The board is dense,
  and a blurred surface over it costs reading.
- **Contrast decides.** Where one of Apple's colours makes less than 4.5 to 1
  as text on its surface, the theme takes Apple's own increased-contrast
  variant of that colour.
- **It stays out of the account panel until it is whole.** `js/theme.js`
  knows the name, so a session can put it on a page, and nobody can pick it
  half built.
- **Light only.** A dark companion is its own plan.
- **It is named `apple-light`,** shown as "Apple light" in the account panel.
- **Apple's current shapes, with solid fills.** Capsule buttons and the
  larger corners of Apple's current look, without its glass.
- **Mac sizes on a wide screen.** A phone keeps each app's own phone layout.
- **The accent is Apple's blue,** for the main button and for links.

## Questions

None open.

## Tasks

- [ ] Measure what `design/docs/apple-token-map.md` lists as not measured:
  the accent-filled states of a button, switch, checkbox and segment, a
  Calendar event, a sheet, an alert, a menu and a list row. They need Apple's
  apps on screen under the light appearance. This Mac is set to dark, so the
  iOS Simulator's stock apps are where a light Calendar event and a sheet can
  be read.
- [ ] Write each token of the `apple-light` block in
  `design/css/rux-theme.css` beside its source row in
  `design/docs/apple-token-map.md`, and mark the hover and active steps Apple
  does not name as derived.
- [ ] Give the inline notification, the toast and the header bar Apple's
  shapes. They still draw as Carbon's.
- [ ] Set Apple's type sizes and weights.
- [ ] Finish the scheduler in `scheduler/theme.css`: the roster and its
  availability cells, the document viewer, the trip card docked on a phone,
  and the phone's own toolbar.
- [ ] Give every other app's `theme.css` its `apple-light` block where the
  app sets colours by theme.
- [ ] Run Design's contrast measurement in each app and the full check, and
  fix each failure with Apple's increased-contrast variant.
- [ ] Check in Chrome on :8641 at desk and phone width against the
  measurements: the board, the trip editor's five tabs, the lists, a pop-up,
  the trip card and Design's kitchen sink.
- [ ] List the theme in the account panel through
  `design/tools/lib/shell.mjs`, `design/tools/build-builder.mjs` and
  `design/tools/build-readme.mjs`, and rebuild the pages.
