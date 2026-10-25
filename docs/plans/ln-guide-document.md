---
type: plan
---

# Plan: LN Guide's Document, its Guide and a team tier

## Goal

Two formats from one export. The Guide is for doing: one step at a time, fast,
on a phone beside LN. The Document is for reading, printing and sharing: a
procedure a consultant can hand to a client or a colleague and be proud of.
And a team, after log-in, sees what the public page cannot carry.

## Decisions

### The two formats

- **The Guide is for doing, the Document for reading, printing and sharing.**
  Both draw on the same export, so a correction reaches both at once. The Guide
  is Guided; the Document is what a process page and a task's other view
  become, and what Print prints.

- **The Guide gives the value its own box**, above You should see and as large,
  with the value's exact text a chip that copies it, and a task ends on a card
  naming its result and the next task, so finishing one is never silent.

- **A process is one Document, every task's steps inline**, the way a
  procedure manual reads; a task's Document is the same shape for one task.
  The process's path of tasks becomes its Summary, so nothing is lost.

- **The Document's parts, in order:** a title block of the title, its
  purpose, and on screen five facts (status as a grey progress icon and its
  words, module, length, updated, applies to), with a Note when nobody has walked it; then Summary, the tasks
  with their result and step count and the values the run uses, each naming
  the step that uses it; Before you start, only what lies outside the
  procedure; Procedure, each task with its result and screen, Why LN works
  this way, its notices, one table of Step · Action · Value · You should see,
  and its own If something goes wrong; then Variations, What comes next,
  Reference, Known gaps, and Screens used with how to open each.

- **A step is numbered by its task and its place, 2.3,** in its table and
  wherever the Document points at it, so "see step 1.4" needs no task name and
  reads the same aloud on a call. Sections carry names and no numbers, so only
  tasks and steps are counted.

- **Why comes before the steps, at full strength**, because it is what a
  learner reads the Document for; a reader who only wants the steps skips one
  paragraph.

- **A figure worth noting gets a line to write it on**, under Write down in
  You should see, so a printed Document is also the worksheet of a run.

- **A gap is listed once, in Known gaps**, by the step or the row it belongs
  to, and never left inside an answer, so a shared Document never reads as
  unfinished mid-sentence.

- **Its version is the date its content last changed**, as Updated and in the
  running footer; the atlas commit stays in the small print on screen, because
  a commit means nothing to a client.

- **A Document stays a procedure.** Explanation and reference live on pages of
  their own, idea pages and reference sheets, and the Document lists them,
  because a procedure that carries its own background is the 11-page print of
  Set up a GenAI prompt. Diátaxis, Red Hat's modular documentation and GitLab's
  task topic all hold this line.

- **On paper the Document is Letter at 10 point**, ruled tables with no fills,
  a running footer of its title, its Updated date and Page N of M, and no
  heading left at a page's foot. What comes next, Reference and Known gaps
  stay on screen, because a printed copy is the tasks, stands on its own and
  says only what is known.
  It prints from the browser's dialog, where
  Save as PDF is a destination, so no PDF library is added. With a reader's screenshots,
  Ship from stock prints about 11 pages.

- **Atlas sends structure, so the build stops guessing.** A callout travels as
  a callout block, and a step's place, action, value and result as fields of
  their own, under a new contract; the build's pattern matching for them goes.

### A team tier

- **The site stays public, and the team reads more after log-in.** GitHub Pages
  serves every committed file to anyone, so a log-in on the page hides nothing;
  what only the team sees is read from the database under row security, as the
  owner's private detail is now.

- **The team is every account that can open LN Guide**, the same access the
  switcher gives, so its rules ask the app check Sevens' tables ask for
  Sevens. rux, as the environment's user, allows them to see captures of LN.

- **The team sees one screenshot per task**, cropped and redacted in atlas,
  sent by atlas's sync to the private `ln-screens` bucket, and drawn by the page
  after log-in through links signed for a few minutes, as the scheduler's
  documents are. A logged-out visitor sees the page without them. Text stays
  the step, because a screenshot goes stale and the reader reads words first.

- **Paper carries the screenshots.** Print's copy of the page is logged in
  too, so it fetches them, and it waits until every picture has loaded before
  the print dialog opens, so none prints blank.

- **A screen's whole field reference stays the owner's**, because it rests on
  Infor's help, which the permission given covers only for captures of LN.

- **The team's screenshots and real test records follow
  [the standard](../../ln/docs/document-standard.md).**

## Questions

- None open.

## Tasks

- [ ] In LN Guide, give Guided's value its own box and end a task on a card
      naming its result and the next task.
- [ ] In atlas, move Set up a GenAI prompt's reference sections into concept
      and reference documents, published as idea pages and a reference sheet.
- [ ] In atlas, send a callout as a block and a step's parts as fields under
      a new contract, and remove the build's pattern matching for them.
- [ ] Send each walk's real records, the customer, item and warehouse, to the
      same readers, and show them beside the example values.
