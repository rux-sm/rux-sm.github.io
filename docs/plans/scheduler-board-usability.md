---
type: plan
---

# Plan: The board's header, editor footer and toolbar menu

## Goal

Around the board, the scheduler says and offers only what a person working
the week needs: no words about what the page has loaded, no destructive
button beside Save, and the toolbar's ⋮ holding actions apart from how the
board looks.

## Decisions

- **The header's loading words are the View menu's Activity,** off until
  turned on and on in rux's saved view; `scheduler/activity.js` writes what
  the page fetches and holds, as "Loading 35 weeks around Nov 9" and "35
  weeks held, Jul 5 – Mar 6".
- **The editor's footer reads Cancel trip, Reset and Save;** Cancel trip
  already asks for a reason before it cancels anything.
- **The toolbar's ⋮ holds the board's actions,** Suggest drivers… and Print
  week, and New trip and Today where the toolbar is narrow, **and sixteen
  view settings:** Compact, five rows, Fill the window, Time at the yard, three
  week starts, three Motions, What the colours mean and Activity.

## Questions

- Should Activity go, the header showing a thin Carbon progress line while
  the page loads and saying only what went wrong, or stay as an option with
  plainer words?
- Should Cancel trip move from the editor's footer into a ⋮ in the editor's
  head, leaving Reset and Save in the footer, so a cancel is never a slip
  beside Save?
- Should the view settings move from the ⋮ into a View button of their own,
  leaving the ⋮ the board's actions, as Carbon's data table toolbar gives
  its settings a button of their own?

## Tasks

- [ ] Change the header's loading words as answered.
- [ ] Move Cancel trip as answered.
- [ ] Split the toolbar's ⋮ as answered.
