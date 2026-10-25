---
type: plan
---

# Plan: LN Guide's values at the step that uses them

## Goal

A guided step that needs a figure written down earlier shows that figure, with
a button that copies it, so the reader never goes looking for it. Each Write
down already has a box, and Your values already lists the run's figures.

## Decisions

- **Atlas marks the use, and the build does not guess.** A step that uses an
  earlier figure names the step and the label of the Write down it reads, and
  atlas's emit sends it as a token of its own under a new contract.
- **Atlas's check fails a use that points at no Write down**, so a reworded
  step cannot leave a value behind.
- **Guided shows the value under the step's action**: its label, the step it
  was written at, the value and Design's copy button. Nothing written yet
  shows the label and a link to that step.
- **Paper is unchanged**: the step's words say which figure to use and where
  it was written.
- **Guide by guide**, Ship from stock first, then each guide as it is reworded
  and walked.

## Questions

- None open.

## Tasks

- [ ] In atlas, add the use marker, its token, the contract and the check.
- [ ] In LN Guide, draw a used value under its step in Guided.
- [ ] Mark the uses in Ship from stock.
- [ ] Mark the uses in each other guide as it is reworded.
