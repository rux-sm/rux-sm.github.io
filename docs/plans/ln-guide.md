---
type: plan
---

# Plan: LN Guide, task-based documentation

## Goal

One place to open while working in Infor LN, and to learn it from. Find a task
and be walking it within seconds, or read it through as documentation.

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

### Four kinds of page

Each kind answers one question, the way professional documentation separates
doing, following, looking up and understanding.

| Page | Answers | From atlas |
| :--- | :--- | :--- |
| **Task**, the main unit | How do I do this one thing in LN? | A task file, one per action |
| **Process** | What do I do, in what order, end to end? | A walkthrough, rewritten as tasks in order |
| **Screen** | What is this LN screen, and how do I reach it? | A `sessions/` file |
| **Idea** | What does this mean, and why does LN work this way? | A `concepts/` file |

- **A task is one action on one or two screens**, named as a verb and its
  object: Create and approve a sales order, Release a sales order to
  warehousing, Generate outbound advice. The same action in two processes is
  one task, so Run order planning links to Create and approve a sales order
  rather than saying to follow another scenario's steps.

- **A process is a path of tasks**, with each decision a fork between the two
  tasks it separates, as the scenario path draws it now. Ship from stock and
  Plan to shipment are processes.

- **The side tasks of the tasks map are tasks too.** One with written steps is a
  task page; one without is a row on its module's index.

### The task page

- **On top, always visible:** the title, one line of purpose, its verified
  status, what must exist first as links to the tasks that make it, and the
  numbered steps. Each step is one short action with what you should see under
  it, and the screen's code is a chip that copies.

- **Folded underneath, open when wanted:** Why LN works this way, If something
  goes wrong, Variations, and Related, which names the screens, the ideas and
  the next task. A fold's label carries its count, such as If something goes
  wrong · 9.

- **Two views of the same task, Guided and Full page.** Guided is the step view
  LN Guide has now: one step at a time, Back and Next, the arrow keys, Read it to
  me and a progress bar. Full page shows the whole task as one readable
  document and is what prints. The reader's last choice is remembered in that
  browser.

- **A step's headline is the action alone.** A menu route, a screen's code and
  a second sentence are moved beneath it by the build, so the library's wording
  stays as it was walked.

- **A step refers to a step by its place on the page**, never by a phase number
  from the library, so no step reads as "phase 1 task 2 steps 1–11".

### The other pages

- **A process page** lists its tasks in order, each with its module and status,
  and draws its decisions as forks. Its Start opens the first task in Guided.

- **A screen page** gives the screen's purpose, code, menu route or how it is
  reached, and the tasks that use it. The owner sees its fields after log-in.

- **An idea page** gives a short explanation in the library's own words, its
  other names, its screens, and the tasks where it matters. The owner sees the
  full account after log-in.

- **A module index** lists the module's tasks: a documented one as a link with
  its status, and one the library has no steps for as a quiet row reading Not
  documented yet. The indexes are how the site shows its own coverage.

### Front door and navigation

- **Home has one search box, three ways in and a place to start.** Do a task,
  Follow a process and Look it up open the task index, the process list and the
  screens and ideas. Carry on returns to where the reader stopped. Start here
  lists the processes in the order they depend on each other, each with its
  verified status.

- **On a wide screen, a left menu by module**, the content column no wider than
  a comfortable line, and an On this page list beside it. The modules are
  Master Data, Sales, Planning, Procurement, Manufacturing, Warehousing and
  Tools.

- **On a phone, one column and a bar at the foot of the window.**

- **Search covers tasks, processes, screens, ideas and problems**, and groups
  its results by kind. A query that names a task, a screen or an idea puts that
  page first; a problem is one of the library's "something went wrong" rows, so
  typing a symptom still finds its fix.

- **Every page has an address**, so Back, a reload and a shared link all work.
  Old addresses are not kept.

### Verified status

- **Each task and process says how far it is verified, in the reader's words:**
  Verified, Walked in LN with its month, or Not walked yet. It is computed from
  atlas and shown on the page, the process, the index and Home.

- **A task nobody has walked says so**, with two buttons for the owner: it
  matched, and it was different. The second asks for one line and takes a
  screenshot.

- **Home ends with one quiet card, Still to confirm**, which lists what waits.
  It has no score and no streak.

- **What the owner sends is evidence, not a change.** It is saved to the
  owner's account and brought into atlas, where a session reads it and decides.

### Easy to read

- **One idea on a screen in Guided**, the step in large type, and no italics.
  Names the reader must find on the LN screen are in bold.

- **A reference table is drawn as a list**, and one whose rows are text to type
  as that text with a Copy button.

- **Source citations stay in atlas.** A guide's name, a page number or a help
  topic never shows in a reader's sentence; a gap shows as one Not documented yet
  line of its own, never appended to a sentence that gives an answer.

- **Read it to me speaks the step** with the browser's own voice, so nothing is
  sent anywhere.

- **Progress is shown and never scored.**

### Private detail

- **A screen's fields and an idea's full account show after log-in**, for the
  owner alone. They rest on Infor's help, so they are read from the database and
  never built into the public page. The opening lines show, and each section
  waits behind its heading.

### The library

- **Atlas gains a task class.** A task file holds its purpose, what must exist
  first, its steps, why LN works this way, its something-went-wrong rows, its
  variations and its sources, and carries the checks a walkthrough's phase does
  now. A walkthrough becomes a process: its tasks in order, its decisions, and
  what the process itself adds.

- **The export gains the task and process kinds**, under a new contract number,
  and LN Guide reads them.

- **A new area of LN is its tasks and the processes that use them.**

- **A walk is recorded in atlas, with atlas's own command.** Atlas's sync
  sends the private detail and brings home what was confirmed.

### Built from Design

- **Every control is Carbon.** The wide layout starts from Design's
  `document-page` template, its side navigation and breadcrumbs, and Guided
  from `wizard-page`'s progress indicator. Search results start from
  `search-results-page` and an index from `list-page`.

- **What Carbon lacks is LN Guide's own**, under the `ln-` prefix, with every
  colour a `--rux-*` token: the process path, the step and the phone bar.

- **Design's button set runs off a phone**, because each button keeps a fixed
  width. Until Design has a set that fits, the two rules that size Back, Next
  and a choice live in `ln/overrides.css`.

### What carries over

- **The pipeline:** atlas, `emit.py`, the export with its pin, the build that
  writes the page, and its list of what it could not place.

- **Carry on, Read it to me, the confirm buttons, the private shelf, the map and
  its whole grid.**

### Left out, on purpose

Scores, streaks and quests; lighting two processes to compare them; and
landings for old page addresses.

## Questions

- **Is the task the right main unit**, with processes built from tasks? The
  other way keeps the scenario as the unit and adds a task index beside it,
  which is less work in atlas and keeps the duplicated steps.
- **Where do a process's example values live?** A task written once can carry
  one example of its own, a process can give each of its tasks the values of
  its run, or a task can carry no example and say only "your value".
- **Does a walk stamp a task or a process?** Stamping tasks lets a task walked
  in one process count in every other; it moves atlas's status, phase and walk
  checks from the phase to the task.
- **Which view opens first, Guided or Full page?** And should a phone open in
  Guided whatever the reader chose on a wide screen?
- **Should public idea pages get a short explanation written for them in atlas**,
  about sixteen of them, or stay one line with the full account behind log-in?
- **What is in the phone bar:** Home, Map and Search as now, or Home, Search and
  Carry on?
- **Does Full page replace the print plan**, `docs/plans/ln-print.md`, so that
  printing a task or a process prints its Full page?
- **Are the AI commands part of Tools, or an area of their own?**
- **Is this the Start here order:** Check an item's inventory, Ship from stock,
  Purchase to receipt, Create test items, Production order, Run order planning,
  Warehouse transfer, Plan to shipment, with the AI commands apart?
- **Should a process end with a short check-yourself**, a question or two drawn
  from its tasks' Why LN works this way, or is that left out with the scores?

## Tasks

- [ ] In atlas, write the task class into `standards/`, its template, its
      frontmatter and its checks, with the process shape a walkthrough takes.
- [ ] In atlas, split each walkthrough's phases into task files, joining the
      phases that are the same action, and rewrite each walkthrough as a process
      that names its tasks.
- [ ] In atlas, move the walked stamps, the walk files and the status
      computation to the unit the walk question settles, with their checks and
      self-test fixtures.
- [ ] In atlas, turn each side task of `maps/tasks.md` that has steps into a
      task file.
- [ ] In atlas, set the one shape for a question in `standards/`, with its
      check, and rewrite each task's questions into it.
- [ ] In atlas, move source citations out of reader sentences into the
      task's sources, and give a gap a line of its own.
- [ ] In atlas, split each step that still runs past three lines on a phone,
      which is one that sets several things at once.
- [ ] In atlas, write a screen file for the five screens still without one, once
      a source says how each is opened.
- [ ] In atlas, give a field's name its own token where it sits inside bold or
      quoted words, and take the underscore tidy out of `ln/app.js`.
- [ ] In atlas, emit the task and process kinds from `tools/emit.py` under the
      new contract number, and document them in `standards/export-json.md`.
- [ ] Build Home, the module indexes, and the task, process, screen and idea
      pages in `ln/tools/build-views.mjs` from the new contract, with Guided and
      Full page on the task page.
- [ ] Group search results by kind, and put a page whose name the query names
      first.
- [ ] Lay out the wide screen from `document-page`, with the module menu and On
      this page, and the phone as one column with its bar.
- [ ] Carry the confirm buttons, Still to confirm and the private detail onto
      the new pages.
- [ ] Give Design a button set that fits a phone, and take the two rules out of
      `ln/overrides.css`.
- [ ] Say in `ln/README.md` what each kind of page is and where it comes from.
- [ ] Check every kind of page in Chrome on :8641, at a phone width and a wide
      one, in a light theme and a dark one, and the Full page of one task in
      print preview.
