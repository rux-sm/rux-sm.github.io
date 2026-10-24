---
type: plan
---

# Plan: a documentation standard for LN Guide's Document

## Goal

LN Guide's printed Document becomes a standard a consultant can hand to any
client: a branded first page, every value the run uses, the steps, a results
checklist to tick and a sign-off. It takes the best of a consultant's work
instruction and keeps what LN Guide already does better: one action per row,
a walked date, and help organised by symptom.

## Decisions

- **Paper's first page opens with a brand block**: the Rux mark, LN Notes,
  the kind of document, its version, module and product, and empty Client and
  Prepared by lines to write on. A client's own name and logo wait until one
  is needed, because no client's name goes on a public page.
- **The version is the Updated date** the footer already prints, and there is
  no revision log, because a hand-kept log goes stale and git is the record.
- **The test values are the table the Document already has.** Its Summary
  shows "Example values from a test run", filled from each task's
  `## N. Example` section in atlas, so the work is writing those sections.
  Only Create and approve the sales order has one today.
- **A task's Example is written from its walk and goes in before the walk**,
  because any change to what a task shows takes its walked mark away, so the
  walk that follows proves the values and stamps the task once.
- **Screens used, Check the result and a sign-off end paper**: the screens
  with how to open each, one row per task with its result and boxes for Pass
  and Fail, and the sign-off's roles named as consultant, key user and
  process owner.
- **The five reworded guides are walked again** once their Example sections
  are in, so every guide carries its values without waiting for its next
  change.
- **Not taken from the work instruction:** several actions in one step,
  because a reader skips the middle one; placeholders left unfilled, because a
  blank ID reads as unfinished; and screenshots, which stay with the team
  tier in [ln-guide-document.md](ln-guide-document.md), because a public page
  cannot carry captures of a client's LN.

## Questions

- None open.

## Tasks

- [ ] In atlas, write the Example section of each task in the six guides
      still to be reworded, before each one's walk in
      [ln-plain-voice.md](ln-plain-voice.md).
- [ ] In atlas, write the Example sections of the five reworded guides and
      walk each again: Set up a GenAI prompt, Check an item's inventory, Use
      the AI commands, Ship from stock and Warehouse transfer. Ship from
      stock's step 2.3 then says to check the Order Type, which LN fills in.
- [ ] In atlas, write each task's result as a fact a tester can tick, with
      the walked figure in its Example, so Check the result can pass or fail.
