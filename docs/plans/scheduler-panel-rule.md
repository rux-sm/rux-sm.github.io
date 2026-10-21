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
  Quote calculator and the document panel are six panels. No panel replaces
  another. A panel's button is pressed while
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
  nothing is hidden behind another and nothing waits. A panel closing for
  room says nothing.
- **Nothing unsaved is lost without asking.** A panel holding typed input,
  the calculator's figures or a form's typed fields, asks before it closes for
  room, and the next oldest closes if the answer is no.
- **When the editor alone stands in the way,** the new panel does not open
  until the editor is closed by hand: the board says so, and the editor's own
  unsaved-changes dialog stands as it does now.
- **A trip's panels follow the selected trip.** Selecting another bar changes
  what an open Forms or document panel shows to that trip's, and one holding
  typed input asks first, keeping what it shows if the answer is no. The
  calculator follows the trip in the editor instead, refilling when the
  selected trip is the editor's, because its miles come from the editor's
  Route tab and following any bar would open the editor on every press.
- **A selected trip with no file of the kind showing** keeps the document
  panel open, saying No files uploaded under its head, which names the trip.
- **A panel that shows one trip names it in its head** with the trip's
  `trip_ref`, as the editor already shows "#1042" beside its title: Forms,
  the calculator and the document panel. To do, Prep and Driver availability
  show no one trip and name none.
- **On a phone, one panel at a time,** in front of the board as today; opening
  one closes the one open, asking first where it holds typed input.

## Questions

- Is the calculator following the editor's trip, rather than any selected
  trip, the right call?

## Tasks

- [ ] Check in Chrome on :8641 with real trips, at a wide window, a laptop
      window and a phone width: open every panel in turn, select other trips
      with Forms and the document panel open, and open a panel with an unsaved
      editor and typed calculator figures, and report what closes and what
      asks each time.
