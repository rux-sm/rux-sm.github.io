---
type: plan
---

# Plan: Notes, pick up and go

## Goal

One place to open while working in Infor LN. Pick a scenario, a task or a
problem, and be walking it within seconds.

**It is simple, quick to pick up and pleasant to use.** The reader has ADHD and
dyslexia, so every screen shows one thing, in short lines and large type, with
one obvious next move and nothing to hunt for.

**Where the library is missing something, the tool says so and makes it easy to
fill.** Confirming a step or reporting that it differed takes one tap, in the
place the reader already is.

**Atlas stays the source.** Everything on a screen is generated from what atlas
exports, so a correction is made once and every screen redraws.

## Decisions

### The flow

- **Home asks one question, "What are you doing?"**, with a search box, a Carry
  on card for the last place the reader stopped, and a card for each scenario.

- **A scenario is a path down the page.** Each task is a stop on it, and a
  decision is a fork drawn between the two tasks it separates.

- **A task is walked one step at a time.** A step shows where the reader is,
  what to do, the screen's code to copy, and what they should see. Back and
  Next move through it, and so do the arrow keys.

- **A decision is a screen of its own**, with every answer as a button: each
  outcome, and "I'm not sure", which opens the screen where the answer is read.
  A setting behind the decision is offered the same way.

- **Help waits until it is asked for.** Under a step sit three quiet links: why
  this step, something went wrong, and read it to me. Nothing else is on the
  screen.

- **Three tabs stay at the foot of the window: Do, Map and Search.**

### Easy to read

- **One idea on a screen**, a column no wider than a comfortable line, the step
  in large type, and no italics. Names the reader must find on the LN screen are
  in bold.

- **Read it to me speaks the step** with the browser's own voice, so nothing is
  sent anywhere.

- **Progress is shown and never scored.** A bar says how far through the task
  the reader is, and the path marks what is done.

- **Where the reader stopped is remembered in that browser only.** Home offers
  it back as Carry on.

### Map

- **The map shows the chosen scenario's route and nothing else**, as the same
  path with each stop's lane named. The whole grid is one button away.

### Search

- **One search over tasks, screens, ideas and problems.** A problem is one of
  atlas's "something went wrong" rows, so typing a symptom finds its fix.

- **Each result says what kind it is**, and opens where it lives.

### Gaps, confirmed in place

- **A step nobody has confirmed in LN says so**, with two buttons: it matched,
  and it was different. The second asks for one line and takes a screenshot.

- **Home ends with one quiet card for what is still unconfirmed**, listing the
  steps and questions that wait, each opening where it belongs. It has no score
  and no streak.

- **What the reader sends is evidence, not a change.** It is saved to the
  reader's account and brought into atlas, where a session reads it and decides.

- **One table holds it, in place of the eight the old tools used.** The table
  and its private bucket are a database change shown to rux and applied on a
  yes.

### Questions on a task

- **Every question is asked where it comes up**, and atlas holds five kinds:
  a decision, something went wrong, a different case, a setting, and what next.

- **A decision is asked between tasks, on the path.** The other four are reached
  from the step, behind "something went wrong" or from Search.

- **Atlas states every question one way:** the task it comes up in, the
  question, its answers, and where each answer leads.

### Built from Design

- **Every control is Carbon:** the search box, buttons, tiles and links. **The
  path, the step and the tab bar are Notes' own**, under the `notes-` prefix,
  with every colour a `--rux-*` token.

- **`notes/specimen-tool.html` shows the flow on invented content**, and the
  build follows its shape.

- **Design's button set runs off a phone**, because each button keeps a fixed
  width. Until Design has a set that fits, the two rules that size Back, Next
  and a choice live in `notes/overrides.css`.

### What carries over

- **The export, the build that reads it, and its list of what it could not
  place.** `notes/do.html`, `notes/understand.html` and `notes/lookup.html` are
  replaced by the flow, and the questions, cards and routes they show move into
  it.

- **The old pages stay until the flow works for Ship from stock**, and go in one
  step after.

### The library

- **A new area of LN is one map file and its walkthroughs.**

- **A walk is recorded in atlas, with atlas's own command.** The old pull from
  Notes is replaced by the one that reads the single table.

### Left out, on purpose

Scores, streaks and quests; lighting two scenarios to compare them; and
landings for old page addresses, which are deleted.

## Questions

- **Is the goal above the right one?** It is set with rux after the specimen
  has been looked at.

- **Where do field meanings and full concepts show?** They come from Infor's
  help, so they cannot sit in this public repository. The choices: the private
  preview on the Mac, the database behind the log-in, or atlas rewriting each
  in its own words so it can publish.

## Tasks

- [ ] Rewrite `notes/tools/build-views.mjs` to write the flow from atlas's
      data: home, path, step, decision, map and search, for every scenario.
- [ ] Add atlas's "something went wrong" rows and its side tasks to Search, each
      labelled by kind.
- [ ] In atlas, export each phase's walked date and each side task's, so a step
      can say whether anyone has confirmed it.
- [ ] Write the one table and its bucket as SQL, show it to rux, and build the
      two buttons and the unconfirmed card on it.
- [ ] In atlas, write the pull that reads the table into the inbox, and correct
      `docs/plans/overview-walks.md` and `docs/handoff.md` to match.
- [ ] Move the two button rules into `notes/overrides.css`, and raise the
      button set's fixed width with Design.
- [ ] In atlas, set the one shape for a question in `standards/`, with its
      check, and rewrite each scenario's questions into it.
- [ ] In atlas, give a short form to each step whose wording runs past two
      lines on a phone.
- [ ] In atlas, record what decides the supply-source turn at Transfer Order
      Planning, the one branch that names no setting.
- [ ] In atlas, give Warehouse transfer and Create test items a map of their
      own, since most of their tasks are not on this chain.
- [ ] In atlas, write a screen file for the four screens still without one, once
      a source says how each is opened.
- [ ] Remove the old pages, `notes/js/experiment.js`, `notes/js/quests.js`,
      `notes/js/tile-owner.js`, `notes/js/tile-walk.js`, `notes/js/online.js`,
      `notes/specimen-tile.html`, `notes/specimen-map.html` and
      `notes/specimen-tool.html`, and bring Notes' checks down to what the
      flow needs.
- [ ] Rewrite `notes/docs/diagram.md` for the path and delete
      `notes/docs/owner-tools.md`.
- [ ] In atlas, stop exporting reviews, summaries and experiments.
- [ ] Lay out the three choices for field meanings and concepts on one page,
      each with a working sample, what it costs to keep, and what leaves the
      Mac.
- [ ] Pull what the eight old tables and two buckets hold into atlas, read each
      record and file back from where it landed, then drop them as a database
      step shown to rux.
