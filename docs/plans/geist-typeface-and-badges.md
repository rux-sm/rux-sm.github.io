---
type: plan
---

# Plan: Geist's typeface, titles and badges in geist-dark

## Goal

The geist-dark theme sets its words in Geist Sans, heads its pages the way
Geist does and colours its tags as Geist's badges, in every app. The other six
themes keep IBM Plex and look exactly as they do.

## Decisions

- **The typeface is Geist's own, self-hosted.** Geist Sans and Geist Mono are
  under the SIL Open Font License. The files sit beside Plex's in
  `design/assets/fonts/` with their licence, as a Latin-1 subset like Plex's.
- **Only geist-dark wears it, by rule.** Carbon's compiled rules name
  `'IBM Plex Sans'` in 30 places and `'IBM Plex Mono'` in 35, so no token
  switches the face; `design/css/rux-overrides.css` names the family for this
  theme, and no Carbon file is edited.
- **Three weights: 400, 500 and 600.** Geist's buttons, badges and table
  headers are 500 and its titles 600, measured on its Button, Badge, Table and
  Modal pages. Plex ships here in 400 and 600 only, which is why those parts
  are still 400 or 600.
- **The font is asked for before first paint.** `plex.css` loads its faces with
  `font-display: optional`, which never swaps in a face that arrives late.
  `design/js/theme.js` runs in the head and already knows the theme, so it adds
  the preload when the theme is geist-dark.
- **Titles are 600 with Geist's tracking, and only in Geist's face.** Geist's
  page title is 24px at 600 with -0.04em tracking, measured on its component
  pages. The tracking is tuned to Geist Sans, so it waits for the face.
- **Tags take Geist's badge colours.** They are tokens in the geist-dark block
  of `design/css/rux-theme.css`, and `design/docs/geist-token-map.md` follows.

## Questions

- Dates and times in the trip editor are set in Plex Mono. In geist-dark, do
  they take Geist Mono, or Geist Sans with its figures all one width?
- The Trips list's status tag is a bar as wide as its column, and Geist's badge
  is as wide as its word. Does the bar stay, become a badge in geist-dark only,
  or become a badge in every theme?
- The board's trips use Geist's quiet badge colours. Do tags take Geist's
  solid colours, which is its default, or the quiet ones the trips use?
- The font files come from Vercel's `geist-font` repository on GitHub. May
  they be downloaded from there?

## Tasks

- [ ] Measure Geist's type on its Typography page in dark mode: size, line
      height, weight and tracking for body, label, heading, button and mono.
- [ ] Add the Geist files and their licence to `design/assets/fonts/`, and a
      stylesheet for them beside `plex.css`.
- [ ] Have `theme.js` preload the Geist faces when the theme is geist-dark.
- [ ] Name the family, the 500 weights and the tracking for geist-dark in
      `rux-overrides.css`, each against its measured value.
- [ ] Set page and panel titles to Geist's size, weight and tracking.
- [ ] Set the tag tokens to Geist's badge colours and regenerate
      `geist-token-map.md`.
- [ ] Snapshot the computed font of one element of each kind in all seven
      themes before and after, and show that only geist-dark moved.
- [ ] Check every app in geist-dark in Chrome on :8641, at desktop and phone
      width.
- [ ] Correct the documents that name Plex as Design's only face.
