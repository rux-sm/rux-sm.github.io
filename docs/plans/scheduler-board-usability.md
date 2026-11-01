---
type: plan
---

# Plan: The board's Activity line and the editor's Cancel trip

## Goal

Around the board, the scheduler says and offers only what a person working
the week needs: the Activity line in everyday words, and no destructive
button beside Save.

## Decisions

- **Activity stays an option in the View menu, in everyday words.** Today
  `scheduler/activity.js` and `data.js` write what the page fetches and
  holds, as "Loading 35 weeks around Nov 9", "35 weeks held, Jul 5 – Mar 6",
  "Reading trip legs" and timings; it will say "Loading trips…" while the
  board reads, "Saving…" while a change is written, "Up to date" at rest and
  what failed when something does, with no week counts, table or function
  names or timings, in its line and in the list its hover shows.
- **The editor's footer reads Cancel trip, Reset and Save;** Cancel trip
  already asks for a reason before it cancels anything.

## Questions

- Should Activity go, the header showing a thin Carbon progress line while
  the page loads and saying only what went wrong, or stay as an option with
  plainer words?
- Should Cancel trip move from the editor's footer into a ⋮ in the editor's
  head, leaving Reset and Save in the footer, so a cancel is never a slip
  beside Save?

## Tasks

- [ ] Reword the Activity line and its hover list in everyday words.
- [ ] Move Cancel trip as answered.
