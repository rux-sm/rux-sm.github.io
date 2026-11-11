---
type: plan
---

# Plan: the scheduler on Carbon's scales

## Goal

`scheduler/tools/check-drawn.mjs` passes in every theme, as it does in Gray
100 and Spotify Dark: nothing the scheduler draws is under 12px, off its
size's tracking, under 4.5 to 1, on a gap off Carbon's spacing scale, or a
mark with a press under 24px by 18px. `scheduler/docs/board-layout.md` has
the measures the tiles and the bar are held to.

## Decisions

- **A bar keeps its one quiet step, 85% of its ink.** Where that falls under
  4.5 to 1 on a theme's bar colour, the theme's ink for that colour is
  raised in `scheduler/theme.css`; the step is not given up, and no line is
  dimmed twice.
- **Words on an inverse tip take an ink made for words.** Carbon's inverse
  support red is a mark's colour, 3.4 to 1 on the tip in the light themes,
  so a late time and Delete there take it toward the tip's ink, as Paid's
  green is taken.
- **A fault that is Design's is fixed in Design.** A link or a primary
  button under 4.5 to 1 in a theme is that theme's token in
  `design/css/rux-theme.css`, never a rule in the scheduler.
- **The check reads what every board draws.** It reads the components page
  on its Full board now; the Compact board and the list pages are read the
  same way before a rule is called held.

## Questions

None open.

## Tasks

- [ ] White and Gray 10: the error red as words in the inverse tip is 3.4
  to 1, on a late and an expected time in the route tip and on Delete.
- [ ] Gray 90: the ghost button in a card's title is 3.3 to 1 on the third
  layer, and an update's age 4.47.
- [ ] Rux 100: an update's age on the unconfirmed red bar is 4.45 to 1.
- [ ] Rux Dark: the contact, at two thirds of the bar's ink, is 3.7 to 4.1
  to 1 on the amber, red, teal, green and purple bars, and the error red as
  words in the tip 4.1.
- [ ] Geist Dark: the quiet step is 4.0 to 4.3 to 1 on the red and purple
  bars, and a relief driver's mark takes a press under 24px by 18px.
- [ ] Ant Dark: the quiet step is 4.2 to 1 on the blue bar.
- [ ] Apple Light: the quiet step is 3.7 to 1 on its tinted bars; in
  Design, a link is 3.5 and a primary button's words 3.7.
- [ ] Apple Dark: the quiet step is 4.4 to 1, and the route tip's planned
  times 4.48.
- [ ] Have `check-drawn.mjs` read the components page's Compact board and
  the list pages.
