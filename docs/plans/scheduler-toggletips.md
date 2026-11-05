---
type: plan
---

# Plan: The board's tips and labels are Carbon's

## Goal

Every tip a press on the board opens is Carbon's toggletip as Carbon draws
it: the inverse surface, 14px text, 16px padding and gap, 288px at most,
13px from the icon pressed, a heading, a body and a footer of a link and a
button. That is the route tip, Alerts, Updates and a driver's tip, opened
from a bar, and the bus number's tip. Every label that shows when the
pointer rests on something on a bar is Carbon's tooltip, where the browser's
own label shows now.

## Decisions

- **Carbon's markup and CSS, unchanged.** The container is
  `rux--popover-container rux--popover--caret rux--popover--high-contrast
  rux--popover--drop-shadow rux--toggletip`, with `rux--popover--open` while
  the tip shows, since Carbon's CSS shows the surface only then. Inside it is
  `rux--popover`, which carries the inverse colours, and in that the surface
  `rux--popover-content` with Carbon's caret beside it, holding the tip as
  `rux--toggletip-content`, nested as Carbon renders them. No local rule
  changes their padding, gap, size or width.
- **One tip at a time, laid over the icon pressed.** The board keeps one
  container and places it over the pressed icon, so Carbon's CSS draws the
  tip and its caret at Carbon's offset. The board only chooses the
  placement class: right of the icon, else left, else above or below, and
  `-start` or `-end` where centred would leave the board. Carbon's own
  pages measure this with floating-ui, which Design's `js/popover.js` does
  not have, and a class is all the board needs.
- **The tip covers its own trip.** That is where Carbon puts it. The live
  card, which is not a toggletip, keeps the placing over the next two days
  and its drawn caret.
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
  wrapping, and a stop a bus out has reached shows Carbon's check and when
  it got there by Samsara's path. **A driver's tip** keeps its face, status,
  clocks, map and links, at Carbon's sizes, Call a link.
- **A driver's tip is one tip that changes when Samsara has them in the
  bus,** not two merged: their answer only matters before the trip, and
  their hours left exist only once they are out.
- **On the road it keeps Call,** at the footer's start, since the office
  calls a driver most while they are out, **and the rest either side,** a
  back-to-back trip with the rest between, amber where it is short, since
  it is about their next trip.
- **Every hover label on a bar becomes Carbon's tooltip, with the same
  words.** On a planned bar: the trip kind arrow, Paid, the balance warning,
  the stop ticks, the −1 and +1 marks, the contact, the times across two
  weeks and the faces. On a bus out on the road, its labels too, so no
  browser label is left on a bar.
- **A label of more than one line keeps its lines,** each its own line in
  the tooltip: a stop tick's, the times row's on a bus out, and a driver's
  not on the trip. Carbon's tooltip runs text together, so a line break in
  the words would not show.
- **One tooltip, laid over what the pointer rests on, as the tip is.** A bar
  clips what is inside it, so the board keeps one Carbon tooltip container,
  `rux--tooltip rux--popover-container rux--popover--caret
  rux--popover--high-contrast`, with `rux--popover` inside it and the surface
  `rux--popover-content rux--tooltip-content` in that, outside the bars. It
  places it over the thing, above first, and chooses another placement by
  the room as the tip does. It shows after 100ms and goes after 300ms, the
  defaults of Carbon's React tooltip, which Design's `js/popover.js` keeps.
- **Carbon's default tooltip for every label,** not its icon tooltip, which
  Carbon keeps for icon buttons, so every label looks the same.
- **A label is the pointer's, until the question below is answered.** Its
  words are in the bar's or the mark's accessible name, so a screen reader
  has them without a tab stop on each mark. This departs from Carbon, whose
  tooltip opens on focus as well as hover and sits on a trigger that takes
  focus; these marks take none.
- **The phone's half sheet keeps its own card.** Only the floating tips
  change.
- **The new tips are drawn in `trip-tips.js`,** which the board and the
  components page's samples both draw from, so they are drawn once.

## Questions

- **Does a driver's tip on the road keep the leg's map?** The live card,
  Live map and Google Maps already show it. Without it the tip is the
  person: their hours left, what is wrong, and Call, with Live map beside
  Call in the footer.
- **Do the labels on marks that cannot take focus stay the pointer's, or
  become Carbon's definition tooltip?** Paid, the balance warning, the −1
  and +1, the contact, the times, the stop ticks, the kind arrow and the
  faces are words or marks with no tab stop, so a keyboard or a phone never
  shows them. Carbon's answer for words in a tight space is the definition
  tooltip: a dotted underline that a press or Tab opens.
- **Where does a bus's engine warning lamp show on a wide board?** Only the
  times row's hover label says it there, since nothing on a bus out opens
  the live card, and Carbon says a tooltip must not hold what the office
  needs to act on. It could go on the bar, in a tip a press opens, or the
  live card could get an opener back.
- **Do the bus row heads and the time at the yard between two trips join
  this plan?** They keep the browser's label: a bus's name, seats, type,
  lift, sleeper and status, Trips with no bus yet, and the hours at the
  yard.

## Tasks

- [ ] Give a driver's tip on the road Call and the rest either side.
- [ ] Give the bus number's tip Carbon's padding, gap and width back by
      deleting its rule in `overrides.css`, and draw its rows as the others.
- [ ] Add the board's one tooltip, and give it every label a bar's marks
      carry in `bar.js`, `road-bar.js` and the faces in `data.js`, in place
      of their `title`.
- [ ] Delete the `scheduler-tip` rules nothing draws any more, and correct
      `scheduler/docs/screen-inventory.md` where it describes the tips.
