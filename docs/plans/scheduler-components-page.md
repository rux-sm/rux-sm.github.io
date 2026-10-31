---
type: plan
---

# Plan: The scheduler's components page

## Goal

One page shows every scheduler component in every state, drawn by the
board's own code from invented sample trips, so a change to the board shows
there at once and the page cannot drift from it. `scheduler/components.html`
has the trip bar and a bus out on its trip; the rest of the board's own
parts join it.

## Decisions

- **Each part's drawing moves out of `data.js` into a file of its own,**
  handed what it reads from the board instead of reaching into `data.js`'s
  state, as `bar.js` and `road-bar.js` were. `data.js` calls it as before,
  and the board looks and behaves exactly as it did.
- **Its samples join `components-data.js`,** invented like the rest, and
  `components.js` draws each as a section under the page's Motion, board and
  rows.
- **The sections after the bars, in order:** the trip card and its tabs,
  with the live card and its map; the Tasks list's rows and the Departures panel;
  a bus's row head, its tip and the yard card; the editor's route stops,
  quote lines and billing tiles.
- **`tools/check-bar.mjs` grows a case for each,** the classes and words
  each sample should carry.

## Questions

None open.

## Tasks

- [ ] Move the trip card and its tabs, with the live card and its map, out
      of `data.js`, and add their section.
- [ ] Add the section for the task rows and the Departures panel, whose
      drawing is already in files of their own.
- [ ] Move the yard card out of `data.js`, and add the section for it and a
      bus's row head and tip, which `bus-head.js` already draws.
- [ ] Move the editor's route stops, quote lines and billing tiles, and add
      their section.
