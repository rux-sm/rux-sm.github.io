---
type: plan
---

# Plan: test values and a results checklist in every LN Guide Document

## Goal

A printed Document is also a test sheet. It opens with every value the run
uses, and ends with one checklist of results, each with a box for Pass or
Fail, the way a consultant's work instruction does.

## Decisions

- **The test values are the table the Document already has.** Its Summary
  shows "Example values from a test run", filled from each task's
  `## N. Example` section in atlas, so the work is writing those sections.
  Only Create and approve the sales order has one today.
- **A task's Example is written from its walk and goes in before the walk**,
  because any change to what a task shows takes its walked mark away, so the
  walk that follows proves the values and stamps the task once.
- **The checklist is built from what atlas already sends.** A new section,
  Check the result, sits after the Procedure: one row per task, its number,
  its result line and an empty Pass or Fail box, so no guide needs new writing
  for it. The box is on paper only, where it can be ticked.
- **Screenshots stay with the team tier** in
  [ln-guide-document.md](ln-guide-document.md), because a public page cannot
  carry captures of a client's LN.
- **Paper ends with an empty sign-off block**: Prepared, Reviewed and
  Approved, each with a signature and a date line, and no name printed,
  because no name goes on a page.
- **The five reworded guides are walked again** once their Example sections
  are in, so every guide carries its values without waiting for its next
  change.

## Questions

- None open.

## Tasks

- [ ] In LN Guide, add Check the result after the Procedure, one row per task
      with its result, a Pass or Fail box on paper, and the sign-off block at
      the end of paper; check it prints.
- [ ] In atlas, write the Example section of each task in the six guides
      still to be reworded, before each one's walk in
      [ln-plain-voice.md](ln-plain-voice.md).
- [ ] In atlas, write the Example sections of the five reworded guides and
      walk each again: Set up a GenAI prompt, Check an item's inventory, Use
      the AI commands, Ship from stock and Warehouse transfer.
