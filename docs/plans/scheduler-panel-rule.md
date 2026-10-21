---
type: plan
---

# Plan: Scheduler panel rule

## Goal

Every panel on the board behaves one way: each button opens its own panel,
panels line up beside the week in the order they were opened, and when a new
one does not fit the oldest closes, so what is open is always what is on
screen.

## Decisions

- **Every panel is independent.** To do, Prep, Driver availability, Forms,
  Quote calculator, the document panel and the trip editor are seven panels,
  where today To do and Prep share the lists pane and Forms and the calculator
  share the document panel. No panel replaces another. A panel's button is
  pressed while it is open and a press shuts it.
- **One panel per kind.** Opening Forms for another trip, or another stored
  file, changes what that one panel shows rather than opening a second.
- **A stored file has the document panel,** with no toolbar button, because a
  file is picked from a trip. A form opened from the Forms list or from Prep
  shows in the Forms panel.
- **Oldest farthest left, newest nearest the week.** Panels stand left of the
  week in the order they were opened, the trip editor among them, so a new
  panel always appears in the same place, just left of the week.
- **As many open as fit.** The sum `placeRoom` in `scheduler/data.js` already
  makes stays: the week's minimum plus every open panel's width and gap.
- **Past it, the oldest closes,** from the left, until the new one fits;
  nothing is hidden behind another and nothing waits. This replaces the
  takeover, where the newest came in front of the board.
- **An editor with unsaved changes is never closed for room;** the next
  oldest closes instead.
- **On a phone, one panel at a time,** in front of the board as today; opening
  one closes the one open.
- **A panel that shows one trip names it in its head,** as Forms already does,
  "Forms — Paragon Casino": the editor, Forms, the calculator and a stored
  file. To do, Prep and Driver availability show no one trip and name none.

## Questions

- Should the trip editor move to the left of the week with the others, or stay
  on the right where it is now?
- Should a trip's panels follow the selected trip, so selecting another bar
  changes what an open Forms or calculator shows, or keep the trip they were
  opened on?
- Trips have no number today; only To do rows do. Should every trip get one, a
  new `trips.number` the database gives each trip as `to_dos.number` does, so
  a panel's head reads "Forms — #1042 Paragon Casino", or is the destination
  enough?
- When only an editor with unsaved changes is left and the new panel still
  does not fit, should the new panel open in front of the board, or should the
  unsaved-changes dialog ask first?
- Should a panel closed for room say so, with a toast such as "Closed To do to
  make room"?

## Tasks

- [ ] Split the lists pane into a To do panel and a Prep panel, each with its
      own head and close, in `scheduler/index.html`, `scheduler/to-do-list.js`,
      `scheduler/departures-panel.js` and `scheduler/app.css`.
- [ ] Split the document panel into Forms, Quote calculator and document
      panels, with `openForms`, `openCalculator`, `tellCalculator` and
      `openDocument` in `scheduler/data.js` each opening its own, and the
      size button on the document panel alone.
- [ ] Order the panels by when each opened, oldest farthest left, in place of
      the fixed `order` each has in `scheduler/app.css`.
- [ ] Replace the takeover in `placeRoom` with closing the oldest, skipping an
      editor with unsaved changes, and keep one panel at a time below md.
- [ ] Point each toolbar button at its own panel, pressed while it is open.
- [ ] Name the trip in the head of the editor, Forms, the calculator and the
      document panel.
- [ ] Rewrite the panel parts of `scheduler/docs/screen-inventory.md` and the
      comments in `scheduler/app.css` and `scheduler/data.js` that describe the
      takeover and the shared panes.
- [ ] Check in Chrome on :8641 at a wide window, a laptop window and a phone
      width: open every panel in turn, and an editor with an unsaved change,
      and report what closes each time.
