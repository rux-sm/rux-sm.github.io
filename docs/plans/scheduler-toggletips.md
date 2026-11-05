---
type: plan
---

# Plan: The board's tips are Carbon's toggletip

## Goal

Every tip a press on the board opens is Carbon's toggletip as Carbon draws
it: the inverse surface, 14px text, 16px padding and gap, 288px at most,
13px from the icon pressed, a heading, a body and a footer of a link and a
button. That is the route tip, Alerts, Updates and a driver's tip, opened
from a bar, and the bus number's tip.

## Decisions

- **Carbon's markup and CSS, unchanged.** The container is
  `rux--popover-container rux--popover--caret rux--popover--high-contrast
  rux--popover--drop-shadow rux--toggletip`, the surface
  `rux--popover-content rux--toggletip-content` with Carbon's caret beside
  it, and no local rule changes their padding, gap, size or width.
- **One tip at a time, laid over the icon pressed.** The board keeps one
  container and places it over the pressed icon, so Carbon's CSS draws the
  tip and its caret at Carbon's offset. The board only chooses the
  placement class: right of the icon, else left, else above or below, and
  `-start` or `-end` where centred would leave the board. Carbon's own
  pages measure this with floating-ui, which Design's `js/popover.js` does
  not have, and a class is all the board needs.
- **The tip covers its own trip.** That is where Carbon puts it; the
  placing over the next two days, and its hand-drawn caret, go.
- **Every tip has a heading, its name and count in heading-compact-01, then
  its body, then a footer where it acts:** Carbon's
  `rux--toggletip-actions`, a link at the start and a small primary button at
  the end. Items in the body are 16px apart with no line between them.
- **One ink.** Words are the inverse text, and a by-line or a column name is
  12px in that ink, not faded, since Carbon has no second inverse text
  colour. Status icons keep Carbon's inverse support colours.
- **A tall tip scrolls its body only,** under the heading and over the
  footer, within the board's room, as Carbon's toggletip says.
- **Updates:** the newest five, each its words over who wrote it and when,
  then a footer of a `Show all` link with the count and an `Add update`
  button. Add update puts Carbon's small field, with Cancel and Save, in the
  footer's place.
- **An update is changed or deleted from a pencil at its end:** Carbon's
  small ghost icon-only button, Carbon's `i-edit` icon, which Design has,
  with its tooltip, Edit update. It opens the update in place, its box with
  Delete, Cancel and Save, as a press on the row does now.
- **Alerts:** each alert is its icon and its words, the words a Carbon link
  to where it is put right, and a reminder's when stays at its end.
- **The route tip** keeps its table, at 14px inside 288px, a stop's name
  wrapping. **A driver's tip** keeps its face, status, clocks, map and links,
  at Carbon's sizes, Call a link.
- **The phone's half sheet keeps its own card.** Only the floating tips
  change.
- **This follows the components page's first task,** which moves the tips
  out of `data.js` (`docs/plans/scheduler-components-page.md`), so the new
  tips are drawn once, on the board and as samples.

## Questions

- **Do the bar's nine hover labels become Carbon tooltips in this plan, or
  in a plan of their own?** They are the browser's own labels now: the trip
  kind arrow, Paid, the balance warning, the stop ticks, the −1 and +1
  marks, the contact, the times across two weeks and the faces.

## Tasks

- [ ] Lay the tip over the pressed icon in Carbon's container, choosing its
      placement class by the room on the board, and delete the day-column
      placing, the drawn caret and the `data-tip` rules in `app.css` and
      `theme.css`.
- [ ] Draw Updates as decided, with its pencils.
- [ ] Draw Alerts as decided.
- [ ] Draw the route tip and a driver's tip as decided.
- [ ] Give the bus number's tip Carbon's padding, gap and width back by
      deleting its rule in `overrides.css`, and draw its rows as the others.
- [ ] Delete the `scheduler-tip` rules nothing draws any more, and correct
      `scheduler/docs/screen-inventory.md` where it describes the tips.
