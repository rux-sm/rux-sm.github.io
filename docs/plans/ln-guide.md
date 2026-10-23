---
type: plan
---

# Plan: LN Guide, task-based documentation

## Goal

One place to open while working in Infor LN, and to learn it from. Find a task
and be walking it within seconds, or print it and hand it on as a document a
consultant would be proud to share.

**It is simple, quick to pick up and pleasant to use.** The reader has ADHD and
dyslexia, so a walked step shows one thing, in short lines and large type, with
one obvious next move and nothing to hunt for.

**It documents LN by action and by process, for what the library knows.** A
task is written once and every process that needs it links to it. Where the
library knows nothing yet, the page says so instead of hiding the gap.

**Where the library is missing something, the tool says so and makes it easy to
fill.** Confirming a step or reporting that it differed takes one tap, in the
place the reader already is.

**Atlas stays the source.** Everything on a page is generated from what atlas
exports, so a correction is made once and every page redraws.

## Decisions

### A documentation site, with a walked mode inside it

- **The site is the house and Guided is a room in it.** Every page shares
  Design's shell: the header, a left menu on a wide screen, and one reading
  column. A task page is a document first, and one button at its top, Walk it,
  turns it into the step-at-a-time view LN Guide has now. One shell is simpler
  to learn than a site and a phone app with tabs.

- **The mockup in `design/m/ln-guide/` is the picture of these decisions**:
  Home, the Ship from stock process page, one task in both views, and the
  Document of three processes, `doc-*.html`, drawn by its `build-doc.mjs`
  from the export's own text. A decision changes there first, because a
  mockup is cheap to redraw.

### Four kinds of page

Each kind answers one question, the way professional documentation separates
doing, following, looking up and understanding, which Diátaxis names how-to,
tutorial, reference and explanation.

| Page | Answers | From atlas |
| :--- | :--- | :--- |
| **Task**, the main unit | How do I do this one thing in LN? | A task file, one per action |
| **Process** | What do I do, in what order, end to end? | A walkthrough, rewritten as tasks in order |
| **Screen** | What is this LN screen, and how do I reach it? | A `sessions/` file |
| **Idea** | What does this mean, and why does LN work this way? | A `concepts/` file |

- **A task is one action on one or two screens**, named as a verb and its
  object: Create and approve a sales order, Generate outbound advice. Each
  task is one file, today one per walkthrough phase, and a task that needs
  another's work links to it rather than repeating its steps. Two tasks merge
  only when a check shows the same steps, because Ship in a sales order is
  not Ship in a transfer.

- **A process is a path of tasks**, with each decision a fork between the two
  tasks it separates, as the scenario path draws it now. Ship from stock and
  Plan to shipment are processes.

- **The side tasks of the tasks map are tasks too.** One with written steps is a
  task page; one without is a quiet row on the task index.

- **A task carries one example of its own**, the values it was walked with, so
  it reads whole on its own. A process says at its head which values its run
  uses.

### The task page

- **A task page is its Document**, as
  [`ln-guide-document.md`](ln-guide-document.md) decides, with a strip saying
  which task of which process this is and what comes next, and one Walk it
  button. In Guided, a step that names a field the example gives shows that
  value under its headline, so the reader never leaves the step to find it.

- **Two views of the same task, Document and Guided.** The Document is the
  task as one readable document and is what prints. Guided is one step at a time:
  a progress bar under the task's name, the step in large type, what you should
  see, the route, two closed folds reading Stuck? with its count and Why LN
  works this way, two quiet links reading Document and Read it to me, and
  Back and Next fixed at the foot, with the arrow keys. It is one column on
  every screen, because one layout stays right where a second one drifts.

- **The screen's shape decides which view opens, not a memory.** A phone opens
  Guided, a wide screen opens the Document, and the other view is one tap away. A
  rule the reader can predict beats a setting they cannot see.

- **A step's headline is the action alone.** A menu route, a screen's code and
  a second sentence are moved beneath it by the build, so the library's wording
  stays as it was walked.

- **A step refers to a step by its place on the page**, never by a phase number
  from the library; one in another task is named by that task's title too.

### The other pages

- **A process page is its Document**, every task's steps inline, with the
  decisions the map puts between two tasks as rows of its Summary and one
  Start button, which opens the first task in Guided.

- **A screen page** gives the screen's purpose, code, menu route or how it is
  reached, and the tasks that use it. The owner sees its fields after log-in.

- **An idea page** gives a short explanation written for it in atlas, its other
  names, its screens, and the tasks where it matters. The owner sees the full
  account after log-in. A one-line idea page is a dead end.

- **The task index** lists every task grouped by module: a documented one as a
  link with its status, and one the library has no steps for as a quiet row
  reading Not documented yet. The index is how the site shows its coverage.

- **The map stops being navigation.** Its grid is drawn once, on the idea page
  about how an order moves through LN, and no tab or menu entry leads to it.
  The numbered path, the useful half of the old Map tab, is the process page.

### Front door and navigation

- **Home asks What are you doing?** and answers with one search box, one Carry
  on card that returns to where the reader stopped, Start here, the processes
  as cards in order with their verified status, and, for the owner alone, one
  quiet card, Still to confirm. There are no other doors, because a reader does not know whether
  what they want is a task or a process.

- **The Start here order** is Check an item's inventory, Ship from stock,
  Purchase to receipt, Warehouse transfer, Create test items, Production order,
  Run order planning, Plan to shipment, Set up a GenAI prompt and Use the AI
  commands: the concrete warehousing processes before the planning ones, and
  the AI commands last, with Tools as their tag and no area of their own.

- **On a wide screen, a left menu of the processes** in the Start here order,
  then Screens and Ideas, one flat entry each. A learner thinks in what they
  are doing, not in LN's modules, so the module is a tag on a task and the
  grouping of the task index. The content is one column, no wider than a
  comfortable line, with no On this page list, because the Summary already
  links each task.

- **On a phone, one column and no bar at the foot.** The header's menu button
  opens the same menu and its search action opens search, so the only fixed
  thing on a phone is Guided's Back and Next.

- **Search covers tasks, processes, screens, ideas and problems**, grouped by
  kind. A query that names a page puts it first, and a problem is one of the
  library's "something went wrong" rows, so typing a symptom finds its fix.

- **Every page is its own file with a plain address** under `do/`, `follow/`,
  `screens/` or `ideas/`, so Back, a reload, a shared link and a printed page
  all work. Old addresses are not kept.

### Verified status

- **Each task and process says how far it is verified, in the reader's words:**
  Verified, Walked in LN with its month, Walked 6 of 11 when only some of a
  process's tasks are, or Not walked yet. It is computed from
  atlas and shown on the page, the process, the index and Home.

- **A walk stamps a task, not a process.** Atlas's status, phase and walk
  checks move from the phase to the task, and a stamp counts in every process
  that shares the task once two are merged.

- **A task nobody has walked says so**, with two buttons for the owner: it
  matched, and it was different. The second asks for one line and takes a
  screenshot.

- **What the owner sends is evidence, not a change.** It is saved to the
  owner's account and brought into atlas, where a session reads it and decides.

### Easy to read

- **One idea on a screen in Guided**, the step in large type, and no italics.
  Names the reader must find on the LN screen are in bold.

- **A reference table is drawn as a list**, and one whose rows are text to type
  as that text with a Copy button.

- **Source citations stay in atlas.** A guide's name, a page number or a help
  topic never shows in a reader's sentence, and a gap is one line of its own,
  Not documented for this release yet, never appended to an answer.

- **Read it to me speaks the step** with the browser's own voice, so nothing is
  sent anywhere. Progress is shown and never scored.

### Print

- **What prints, and the Guide beside it, are decided in
  [`ln-guide-document.md`](ln-guide-document.md).**

### Private detail

- **A screen's fields and an idea's full account show after log-in**, for the
  owner alone. They rest on Infor's help, so they are read from the database and
  never built into the public page; the opening lines show, and each section
  waits behind its heading.

### The library

- **Atlas gains a task class.** A task file holds its purpose, what must exist
  first, its steps, its example, why LN works this way, its something-went-wrong
  rows, its variations and its sources, and carries the checks a walkthrough's
  phase does now. A walkthrough becomes a process: its tasks in order, its
  decisions, and what the process itself adds.

- **The export gains the task and process kinds first**, under a new contract
  number, with each phase written as a task and each walkthrough as a process
  until task files exist, so the site builds from it at once.

- **A task's example is its `## N. Example` section**, the `What · Value`
  table atlas's task template already names, and only a value a reader could
  type crosses: an order type, a date, a quantity, a `BAM-*` test item. The
  environment's own item, partner, office, site and warehouse stay in the
  notes, and a date is also given as its distance from another, so a reader
  can pick their own. The export sends it as the task's `example`, contract
  22, and marks each step row with the example rows whose field it names, so
  the page never matches names itself.

- **A process's values are its tasks' examples, gathered in order** by the
  emitter, one row per what; a process writes none of its own, because one
  fact has one home.

- **A new area of LN is its tasks and the processes that use them.**

- **A walk is recorded in atlas, with atlas's own command.** Atlas's sync
  sends the private detail and brings home what was confirmed.

### Built from Design

- **Every control is Carbon.** The wide layout is Design's `document-page`
  template; Guided's progress is Carbon's progress bar, a fold its accordion,
  and the code chip its inline code snippet.
  Search results start from `search-results-page` and the task index from
  `list-page`.

- **What Carbon lacks is LN Guide's own**, under the `ln-` prefix, with every
  colour a `--rux-*` token: the path, the step, the step list and Guided's bar.

- **Design's button set runs off a phone**, because each button keeps a fixed
  width, so the two rules that size Back, Next and a choice live in
  `ln/overrides.css` until a second app needs a set that fits.

### What carries over

- **The pipeline and the reader's tools:** atlas, `emit.py`, the export with
  its pin, the build with its list of what it could not place; and Carry on,
  Read it to me, the confirm buttons and the private shelf.

### Left out, on purpose

Scores, streaks and quests; a check-yourself at the end of a process, for the
same reason as the scores; the Map tab; a bar at the foot of a phone; lighting
two processes to compare them; and landings for old page addresses.

## Questions

None open.

## Tasks

- [ ] In atlas, write the Example of every other walked task, one process at
      a time, from the run that walked it.
- [ ] In atlas, write a screen file for the four screens still without one, once
      a source says how each is opened.
