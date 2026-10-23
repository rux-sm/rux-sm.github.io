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
  Reference by title only, Known gaps, and Screens used with how to open each.

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
  heading left at a page's foot. It prints from the browser's dialog, where
  Save as PDF is a destination, so no PDF library is added. The mockup's Check
  an item's inventory is 2 pages and Ship from stock 8.

- **Atlas sends structure, so the build stops guessing.** A callout travels as
  a callout block, and a step's place, action, value and result as fields of
  their own, under a new contract; the build's pattern matching for them goes.

### A team tier

- **The site stays public, and the team reads more after log-in.** GitHub Pages
  serves every committed file to anyone, so a log-in on the page hides nothing;
  what only the team sees is read from the database under row security, as the
  owner's private detail is now. An LN reader is an account given LN Guide, as
  Sevens and Coins give one app.

- **The team sees a screenshot under each step and a screen's whole field
  reference**, redacted in atlas before it leaves, sent by atlas's sync to a
  private bucket, and drawn by the page after log-in. Text stays the step,
  because a screenshot goes stale and the reader reads words first.

## Questions

- Who is the team, and do Infor's licence and the environment's owner allow
  captures of LN and Infor's help to be shown to them?
- What must a screenshot hide before it leaves atlas: user names, the company
  number, partner names, order numbers, anything else?
- Does a Document printed by a team member carry the screenshots, or do they
  stay on screen?

## Tasks

- [ ] In LN Guide, give Guided's value its own box and end a task on a card
      naming its result and the next task.
- [ ] In atlas, move Set up a GenAI prompt's reference sections into concept
      and reference documents, published as idea pages and a reference sheet.
- [ ] In atlas, send a callout as a block and a step's parts as fields under
      a new contract, and remove the build's pattern matching for them.
- [ ] Once the questions are answered, add the LN reader access, its row
      security and a screenshot bucket as a migration, and have atlas's sync
      send redacted screenshots that Guided and the Document draw after log-in.
