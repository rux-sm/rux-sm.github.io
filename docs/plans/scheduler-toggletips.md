---
type: plan
---

# Plan: The board's tips are Carbon's

## Goal

Every tip a press on the board opens is drawn as Carbon draws it, 13px from
the icon pressed, on Carbon's inverse surface. A tip of things to read is
Carbon's toggletip. A tip that lists things to press holds Carbon's disclosed
contained list, each row a press. That is the route tip and a driver's tip,
Alerts and Updates, opened from a bar, and the bus number's tip.

## Decisions

- **Two shapes, both Carbon's markup and CSS, unchanged.** The container is
  `rux--popover-container rux--popover--caret rux--popover--high-contrast
  rux--popover--drop-shadow rux--toggletip` with Carbon's caret. A tip to
  read has the surface `rux--popover-content rux--toggletip-content`: 14px,
  16px padding and gap, 288px at most. A tip of presses has the surface
  `rux--popover-content`, 23rem at most, holding
  `rux--contained-list--disclosed` across its full width: a 32px header with
  the name and count, then 48px rows with a line between, each a press.
  Carbon gives the disclosed list for a list inside a popover.
- **Which is which:** Alerts and Updates are lists of presses. The route
  tip, a driver's tip and the bus number's tip are toggletips.
- **One tip at a time, laid over the icon pressed.** The board keeps one
  container and places it over the pressed icon, so Carbon's CSS draws the
  tip and its caret at Carbon's offset. The board only chooses the
  placement class: right of the icon, else left, else above or below, and
  `-start` or `-end` where centred would leave the board. Carbon's own
  pages measure this with floating-ui, which Design's `js/popover.js` does
  not have, and a class is all the board needs.
- **The tip covers its own trip.** That is where Carbon puts it; the
  placing over the next two days, and its hand-drawn caret, go.
- **A toggletip has a heading, its name and count in heading-compact-01;
  a list's header is its heading.** Where a tip acts, its foot is Carbon's
  `rux--toggletip-actions`, a link at the start and a small primary button at
  the end, 16px in.
- **One ink.** Words are the inverse text, and a by-line, a column name or
  the list's header is 12px in that ink, not faded, since Carbon has no
  second inverse text colour. Status icons keep Carbon's inverse support
  colours.
- **Design draws the contained list on the inverse surface.** Carbon draws
  it on the page's surface only, so Design gives it the inverse surface's
  ground, ink, line, hover and focus inside a high-contrast popover, and the
  foot its 16px there, shown with invented content on its pages; the
  scheduler adds no rule of its own to either.
- **A tall tip scrolls its body only,** under the heading or header and
  over the foot, within the board's room, as Carbon says.
- **Updates:** a row for each of the newest five, its words over who wrote
  it and when. A press on the row opens it in place to change or delete, as
  now. The foot is a `Show all` link with the count and an `Add update`
  button, which puts Carbon's small field, with Cancel and Save, in the
  foot's place.
- **Alerts:** a row for each alert, its icon and words, the press going where
  it is put right, and a reminder's when at the row's end. It has no foot.
- **The route tip** keeps its table, at 14px inside 288px, a stop's name
  wrapping. **A driver's tip** keeps its face, status, clocks, map and links,
  at Carbon's sizes, Call a link.
- **The phone's half sheet and bus sheet keep their own cards.** Only the
  floating tips change.
- **This follows the components page's first task,** which moves the tips
  out of `data.js` (`docs/plans/scheduler-components-page.md`), so the new
  tips are drawn once, on the board and as samples.

## Questions

- **Do the bar's nine hover labels become Carbon tooltips in this plan, or
  in a plan of their own?** They are the browser's own labels now: the trip
  kind arrow, Paid, the balance warning, the stop ticks, the −1 and +1
  marks, the contact, the times across two weeks and the faces.

## Tasks

- [ ] In Design, the disclosed contained list inside a high-contrast
      popover, with a foot, on the inverse surface, shown on its pages.
- [ ] Lay the tip over the pressed icon in Carbon's container, choosing its
      placement class by the room on the board, and delete the day-column
      placing, the drawn caret and the `data-tip` rules in `app.css` and
      `theme.css`.
- [ ] Draw Updates and Alerts as lists of presses.
- [ ] Draw the route tip and a driver's tip as toggletips.
- [ ] Give the bus number's tip Carbon's padding, gap and width back by
      deleting its rule in `overrides.css`, and draw its rows as the others.
- [ ] Delete the `scheduler-tip` rules nothing draws any more, and correct
      `scheduler/docs/screen-inventory.md` where it describes the tips.
