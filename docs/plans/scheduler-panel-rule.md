---
type: plan
---

# Plan: Scheduler panel rule

## Goal

Every panel on the board behaves one way: each button opens its own panel,
panels line up left of the week in the order they were opened, and when a new
one does not fit the oldest closes, so what is open is always what is on
screen. The trip editor is the one exception.

## Decisions

- **Every panel is independent.** To do, Prep, Driver availability, Forms,
  Quote calculator and the document panel are six panels, where today To do
  and Prep share the lists pane and Forms and the calculator share the
  document panel. No panel replaces another. A panel's button is pressed while
  it is open and a press shuts it.
- **One panel per kind.** Opening Forms for another trip, or another stored
  file, changes what that one panel shows rather than opening a second.
- **A stored file has the document panel,** with no toolbar button, because a
  file is picked from a trip. A form opened from the Forms list or from Prep
  shows in the Forms panel.
- **Oldest farthest left, newest nearest the week.** The six stand left of the
  week in the order they were opened, so a new panel always appears just left
  of the week.
- **The trip editor is the exception:** always right of the week, and never
  closed by the board.
- **As many open as fit.** The sum `placeRoom` in `scheduler/data.js` already
  makes stays: the week's minimum plus every open panel's width and gap.
- **Past it, the oldest closes,** from the left, until the new one fits;
  nothing is hidden behind another and nothing waits. This replaces the
  takeover, where the newest came in front of the board. A panel closing for
  room says nothing.
- **Nothing unsaved is lost without asking.** A panel holding typed input,
  the calculator's figures or a form's typed fields, asks before it closes for
  room, and the next oldest closes if the answer is no.
- **When the editor alone stands in the way,** the new panel does not open
  until the editor is closed by hand: the board says so, and the editor's own
  unsaved-changes dialog stands as it does now.
- **A trip's panels follow the selected trip.** Selecting another bar changes
  what an open Forms, calculator or document panel shows to that trip's, and
  one holding typed input asks first, keeping what it shows if the answer is
  no.
- **A panel that shows one trip names it in its head** with the trip's
  `trip_ref`, as the editor already shows "#1042" beside its title: Forms,
  the calculator and the document panel. To do, Prep and Driver availability
  show no one trip and name none.
- **On a phone, one panel at a time,** in front of the board as today; opening
  one closes the one open, asking first where it holds typed input.

## Questions

- When a selected trip has no stored file of the kind the document panel is
  showing, such as no itinerary, should the panel close, or stay on the last
  trip's file with its head naming that trip?

## Tasks

- [ ] Split the lists pane into a To do panel and a Prep panel, each with its
      own head and close, in `scheduler/index.html`, `scheduler/to-do-list.js`,
      `scheduler/departures-panel.js` and `scheduler/app.css`.
- [ ] Split the document panel into Forms, Quote calculator and document
      panels, with `openForms`, `openCalculator`, `tellCalculator` and
      `openDocument` in `scheduler/data.js` each opening its own, and the
      size button on the document panel alone.
- [ ] Order the six by when each opened, oldest farthest left, in place of the
      fixed `order` each has in `scheduler/app.css`, with the editor kept
      right of the week.
- [ ] Replace the takeover in `placeRoom` with closing the oldest, asking where
      a panel holds typed input, and stopping at the editor; keep one panel at
      a time below md.
- [ ] Follow the selected trip in Forms, the calculator and the document
      panel, from `syncSelection` in `scheduler/data.js`.
- [ ] Point each toolbar button at its own panel, pressed while it is open.
- [ ] Put the trip's `#trip_ref` in the head of Forms, the calculator and the
      document panel.
- [ ] Rewrite the panel parts of `scheduler/docs/screen-inventory.md` and the
      comments in `scheduler/app.css` and `scheduler/data.js` that describe the
      takeover and the shared panes.
- [ ] Check in Chrome on :8641 at a wide window, a laptop window and a phone
      width: open every panel in turn, select other trips with Forms and the
      calculator open, and open a panel with an unsaved editor and typed
      calculator figures, and report what closes and what asks each time.
