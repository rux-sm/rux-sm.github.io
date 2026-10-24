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

- **Paper's first page opens with a brand block**: a logo, a company name,
  the title, the kind of document, its version and an empty Prepared by line
  to write on. The other pages keep the plain footer.
- **A box on the page takes a company name and a logo file before printing**,
  kept only in that browser and never published, because no client's name
  goes on a public page. Left empty, the Rux Design mark from
  `design/brand/logo.svg` and the words "Company name" print instead.
- **The version is the Updated date** the footer already prints, and there is
  no revision log, because a hand-kept log goes stale and git is the record.
- **The test values are the table the Document already has.** Its Summary
  shows "Example values from a test run", filled from each task's
  `## N. Example` section in atlas, so the work is writing those sections.
  Only Create and approve the sales order has one today.
- **A task's Example is written from its walk and goes in before the walk**,
  because any change to what a task shows takes its walked mark away, so the
  walk that follows proves the values and stamps the task once.
- **The checklist is built from what atlas already sends.** Check the result
  ends paper beside the sign-off: one row per task, its number, its result
  line and boxes for Pass and Fail, so no guide needs new writing for it. It
  is on paper only, because the screen's Summary already shows each result.
- **Paper ends with an empty sign-off block**: Prepared, Reviewed and
  Approved, each with a signature and a date line.
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

- [ ] In LN Guide, add the brand block to the top of paper's first page, and
      the box that sets its company name and logo in that browser alone.
- [ ] In LN Guide, add Check the result after the Procedure, one row per task
      with its result and a Pass or Fail box on paper, and the sign-off block
      at the end of paper; check both print.
- [ ] In atlas, write the Example section of each task in the six guides
      still to be reworded, before each one's walk in
      [ln-plain-voice.md](ln-plain-voice.md).
- [ ] In atlas, write the Example sections of the five reworded guides and
      walk each again: Set up a GenAI prompt, Check an item's inventory, Use
      the AI commands, Ship from stock and Warehouse transfer.
