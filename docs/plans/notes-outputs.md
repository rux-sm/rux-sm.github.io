---
type: plan
---

# Plan: three outputs — the map, walkthroughs and meeting summaries

## Goal

Notes is rux's own training and learning tool. It publishes three things built
from atlas's knowledge base: the overview map, where each tile is a quick
to-do; walkthroughs, the full steps for one goal; and meeting summaries.
Exercises stay. The session map and the full meeting reviews stop being
outputs, and each test run feeds its results back into the knowledge base.

## Decisions

- One map. The session map is retired: its own text says it composes and owns
  nothing, and its steps live in the planning walkthrough and the screen
  files. Its four "fails with no message" notes are confirmed in that
  walkthrough, line by line, before it goes.
- The detailed step-by-step type is renamed **walkthrough** everywhere: Notes'
  pages, navigation and addresses, and atlas's type, folder, rules and checks.
- A map tile with a walkthrough links to it, and a lookup tile links to the
  inventory walkthrough.
- A new walkthrough, **Check an item's inventory**, holds the inventory lookup
  once: Inventory 360, the per-warehouse view, and on hand, blocked, on order
  and allocated. It is written from `ship-from-stock.md` phase 0, which is
  walked, and the screen files. The walkthroughs that read on-hand today link
  to it as their first step instead of repeating it.
- A meeting summary is titled `Meeting summary · YYYY-MM-DD · Topic` and has
  three parts: what was discussed, the steps shown or agreed, and what was left
  open. Its id and address do not change.
- The full meeting reviews leave the website and stay in atlas, where they
  remain the source each summary is written from.
- A walk gains a **Notes** column for comments, errors and tile feedback. No
  walk exists yet, so nothing migrates.
- The walk form is a page on the private preview, `npm run serve -- --private`,
  which is never published. It shows a walkthrough's steps one at a time, with
  a result and notes for each.
- The form saves through the private preview server, which listens only on
  this Mac: the walk into atlas's `walks/`, screenshots into its `inbox/`. It
  works wherever both repositories are cloned side by side and current.
- A screenshot is dropped or pasted onto its step. The server names it
  `SS_{code}_{what}_{YYYY-MM-DD}.png` from the step's session code and a short
  description rux can edit, never from a step number, and writes the name into
  that step's Evidence cell.
- After each walk one checklist carries the results into the knowledge base:
  correct the walkthrough where LN differed, stamp the phase walked, update the
  screen files, close or open issues, and complete any map placeholder. It is a
  how-to in atlas's `docs/handoff.md`.

## Questions

None open.

## Tasks

- [ ] Write the inventory walkthrough in atlas, and link it from the lookup
      tiles and from each walkthrough that reads on-hand.
- [ ] Rename the type everywhere to the chosen name: atlas's type, folder,
      rules and checks, and Notes' pages, addresses, navigation and prose.
- [ ] Reshape the eight meeting summaries to the standard title and three
      parts, and stop publishing the full reviews.
- [ ] Confirm the session map's four silent-failure notes in the planning
      walkthrough, then retire the map: delete it in atlas, remove its page and
      links, and drop it from `notes/docs/diagram.md`,
      `notes/tools/build-tile-looks.mjs` and the specimen.
- [ ] Publish with `npm run export`, and update `docs/status.md` where an item
      changes.
