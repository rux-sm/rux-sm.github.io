---
type: plan
---

# Plan: Scheduler panel rule

## Goal

Every panel on the board behaves one way: each button opens its own panel,
panels sit beside the week as long as they fit, and when a new one does not
fit the oldest closes, so what is open is always what is on screen.

## Decisions

- **Every button has its own panel.** To do, Prep, Driver availability,
  Forms, Quote calculator and the trip editor are six panels, where today To
  do and Prep share the lists pane and Forms and the calculator share the
  document panel. A panel's button is pressed while it is open and a press
  shuts it.
- **A stored file has one panel of its own,** the document panel, which any
  file opens into and the next file replaces; it has no toolbar button,
  because a file is picked from a trip. A form opened from the Forms list or
  from Prep shows in the Forms panel.
- **As many open as fit.** The sum `placeRoom` in `scheduler/data.js` already
  makes stays: the week's minimum plus every open panel's width and gap.
- **Past it, the oldest closes,** by when each was opened, until the new one
  fits; nothing is hidden behind another and nothing waits. This replaces the
  takeover, where the newest came in front of the board.
- **An editor with unsaved changes is never closed for room;** the next
  oldest closes instead.
- **Each panel keeps a fixed place,** as today's `order` gives them: the lists
  and documents left of the week and the editor right of it, so opening one
  never moves another to a different side.
- **On a phone, one panel at a time,** in front of the board as today; opening
  one closes the one open.

## Questions

- When only an editor with unsaved changes is left and the new panel still
  does not fit, should the new panel open in front of the board, or should the
  unsaved-changes dialog ask first?
- Should a panel closed for room say so, with a toast such as "Closed To do to
  make room"?
- Is the left-to-right order To do, Prep, Forms, calculator, document, Driver
  availability, then the week, then the editor, the right one?

## Tasks

- [ ] Split the lists pane into a To do panel and a Prep panel, each with its
      own head and close, in `scheduler/index.html`, `scheduler/to-do-list.js`,
      `scheduler/departures-panel.js` and `scheduler/app.css`.
- [ ] Split the document panel into Forms, Quote calculator and document
      panels, with `openForms`, `openCalculator`, `tellCalculator` and
      `openDocument` in `scheduler/data.js` each opening its own, and the
      size button on the document panel alone.
- [ ] Replace the takeover in `placeRoom` with closing the oldest, skipping an
      editor with unsaved changes, and keep one panel at a time below md.
- [ ] Point each toolbar button at its own panel, pressed while it is open.
- [ ] Rewrite the panel parts of `scheduler/docs/screen-inventory.md` and the
      comments in `scheduler/app.css` and `scheduler/data.js` that describe the
      takeover and the shared panes.
- [ ] Check in Chrome on :8641 at a wide window, a laptop window and a phone
      width: open every panel in turn, and an editor with an unsaved change,
      and report what closes each time.
