---
type: plan
---

# Plan: Notes, a tiled learning tool

## Goal

One tool rux can use to learn Infor LN, and use from any device. A reader meets
four things — the map, a procedure, an idea, the glossary — and a screen opens
beside the step that needs it. Every claim says where it came from, every gap
says what would settle it, and the gap is shown while rux is standing on the
screen that would answer it. Walking a procedure in LN is what fills the gaps
in, so using the tool is what completes it.

## Decisions

### What a reader meets

- **Four destinations: the map, a procedure, an idea, the glossary.** Homework
  is a fifth, and is the one output about the learner rather than the knowledge.

- **A screen is a panel, not a destination.** atlas's own publishing test is
  that anything a person sits down and reads becomes a page, except reference
  material consulted while walking a page that does publish. Nobody sits down
  to read a screen file. It opens beside the step that names it and closes
  again, so a reader mid-task in LN never loses their place.

- **A screen still has an address**, so search and a link from atlas can reach
  it. Arrived at directly it renders as a page; opened from a step it renders in
  the panel. One document, two presentations.

- **The glossary publishes.** 51 terms, each owned by exactly one idea file,
  already generated and already rule-checked. It is the page a beginner in this
  domain uses most, and it exists today where no reader can see it.

- **An idea publishes once rux has attested to it**, which is what OI-274 asks
  for, and the glossary emits with the class.

- **One procedure type, and the outliers are left odd.** Splitting by kind was
  tested: the size rule is arbitrary, and the better rule — a phase must consume
  what an earlier phase produced — inverted under measurement, because a process
  passes state through the ERP rather than through its prose. The data was the
  real problem and it has moved. The page is designed for the six-phase middle;
  two phases and eleven are allowed to look different.

### The site layout

- **Home is the map**, full width, no side nav open. It is the overview diagram,
  which already draws 26 tiles across six lanes with the arrows that carry the
  branches and feeds; those arrows are the process logic and a flat grid would
  throw them away.

- **A tile is `rux--tile--expandable`, and expanding it is the stage.** Its
  `rux--tile-content__below-the-fold` holds what the stage does, its procedures,
  its ideas and its open questions. There is no stage page and no new address,
  which is the simplest thing that can work.

- **On a phone the diagram becomes one tile per node, grouped by lane.** A
  swim-lane diagram at 402px is unreadable, and both views build from the same
  nodes so neither can drift.

- **A procedure puts its steps first**, each step naming its screen as a chip
  that opens the panel. The `What LN is doing` paragraph stays above the step
  table, where it was put so the teaching is not one click away.

- **The side nav keeps Map, Procedures, Ideas and Glossary.** Screens are not in
  it, because a nav listing 124 of them is what makes a tool feel big.

- **One search box in the header**, over the library's own pages. It is how a
  reader reaches a screen whose stage they cannot guess.

- **Pages are generated, with a few KB of behaviour for the three parts that
  need it**: the panel, search, and the owner's live gaps. The renderer brief
  revisits its own build-time argument, admits it is weaker than it reads, and
  says a hybrid is right if any of it is interactive.

- **Every existing page keeps its address.**

### Grades, in place of Draft and Approved

- **Four grades: Seen here, Documented, Heard, Not known.** Seen here carries
  the date someone opened it in this environment.

- **A grade is worked out from the sources a claim rests on, never typed.** A
  claim citing a capture is Seen here; citing help or a vendor guide,
  Documented; citing only a meeting, Heard; a gap marker, Not known.

- **A phase walked in LN is the strongest Seen here there is**, so the export
  carries each phase's walked date, which is what OI-275 asks for.

- **A page and a tile show a mix, never one word.** A single word would be a lie
  about a page resting on twelve sources. `build/coverage.md` already measures
  most of this and no reader has ever seen it.

- **atlas keeps its own `status:` field.** It answers "is this finished" for the
  library and its rule 6 computes it; a grade answers "how much should I trust
  this" for a reader. Two questions, two fields, neither replacing the other.

- **Approved stops being a badge.** rux's review verdict lives in the review box
  below, not as a second badge beside the grade.

### Gaps, and the walk that closes them

- **The walk is the engine, and there is no second one.** A walk is already a
  record of one run, pinned to the exact commit it walked, written the day of
  the run and immutable after. The rules are written, the page is built, and no
  walk has ever been recorded. The queue feeds it rather than competing with it.

- **A partial page publishes with its holes in place.** Four known steps of
  seven are more use than none, and the shape of what is missing is worth
  seeing.

- **A gap says what would settle it** — which screen answers it, and what to
  capture there — not merely that something is unknown.

- **The grade publishes; the errand does not.** The export tier still carries no
  issue ids, no evidence stamps and no paths into the library, because the site
  is a curtain over a public repository and not a lock: a page fetched with no
  login returns in full. So Not known shows to anyone, and the issue and the
  errand only to the owner, read live.

- **One queue page for the owner**, ordered by the issue's own priority and then
  by how many documents cite the screen that would settle it, so an hour in LN
  has a shopping list.

### Signing in, reviewing, walking

- **The owner's tools appear only for the owner**, the account with the owner
  switch. Anyone else with Notes ticked sees the published pages and nothing
  else. Logging in is the site's own login page.

- **A review box at the foot of every page** records Approve, or Request changes
  with feedback, and says what was last sent and whether atlas has it. A review
  never edits a document: a session applies it, and a changed document returns
  to its computed grade.

- **Homework answers save to rux's account**, and the browser copy stays for
  anyone who is not the owner. The newer copy wins when a page opens.

- **The walk page walks a published procedure.** Each answer saves as it is
  left, screenshots upload from any device, only today's walks are offered to
  continue, and the walk pins the atlas commit the pages were built from.

- **The data sits in five `platform.notes_*` tables and the private bucket
  `notes-walk-shots`**, readable and writable only by the owner. Each database
  change is a named migration shown to rux and applied on a yes, with its
  rollback beside it, never by a website deploy.

- **A pull command on the Mac, atlas's `tools/pull.py`,** writes each walk into
  `walks/` and the screenshots, reviews and worksheets into `inbox/`, then marks
  them pulled. Atlas refuses a commit while the inbox holds anything.

- **The pull reads with the project's secret key, kept in the Mac's Keychain**,
  because it runs without a browser; the key never sits in a file or a
  repository.

### Evidence and search

- **Evidence stays in git, and the bucket is a publishing target rather than a
  new home.** atlas is private, so nothing is exposed by keeping it, and moving
  files out would not shrink a history that keeps every blob. The export uploads
  a copy of each capture a published page shows, the way it already emits JSON.

- **A page shows its capture to a signed-in owner** through a link the database
  signs on request, never a public address. This is the only reason the copy
  exists: git cannot serve a file to a page.

- **Searching Infor's help is its own later decision.** The text of all 117 help
  documents is already extracted and is what principle 6 greps, so the work is
  small; the question is licensing rather than technique.

### What retires

- **Meeting reviews and summaries stop being pages.** They become the sources a
  page cites and is read through. Their three parts each have a better home now:
  the steps in a procedure, the open items in the queue, and what was discussed
  in the idea and screen files. A summary still carrying something unique means
  the mining is unfinished.

- **The long phase notes move out** of each procedure into the screen or idea
  that owns them, so a procedure is scannable while standing in LN.

- **The planning route stops being its own document** and becomes a route across
  the map's tiles.

- **The session map retires** once its four silent-failure notes are confirmed
  in a procedure.

- **The private-preview walk form retires** when the online walk replaces it.

## Questions

None open.

## Tasks

### First slice — the Enterprise Planning lane, end to end

- [ ] rux attests to the four ideas the lane uses, so the class can publish.
- [ ] Carry those ideas and the lane's screens through the export, and render
      the idea page, the screen page and the glossary.
- [ ] Build the screen panel, opened from a step chip and closed again.
- [ ] Work out the four grades from each claim's sources, carry them through the
      export, and show them as a mix in place of Draft and Approved.
- [ ] Make the lane's tiles expandable into their stage.
- [ ] Show its gaps in place: the grade to everyone, the issue and the errand to
      the owner only, read live.
- [ ] rux stores the project's secret key in the Keychain, then walks one
      planning procedure online and runs `python3 tools/pull.py`.
- [ ] Use the slice for a week, and record here what it got wrong.

### The rest, once the slice holds

- [ ] Attest to the remaining ideas, and carry every remaining screen through.
- [ ] Grade, tile and expand the other five lanes.
- [ ] Carry each phase's walked date into the export and show it.
- [ ] Build the phone view: one tile per node, grouped by lane.
- [ ] Add the header search over the library's own pages.
- [ ] Build the owner's queue page, ordered by priority then by citations.
- [ ] Upload each published page's captures to the private bucket at export, and
      show one to a signed-in owner through a signed link.
- [ ] Cut the side nav to Map, Procedures, Ideas and Glossary.
- [ ] Move Ship from stock's long phase notes into the screen or idea that owns
      each, then the other seven one at a time.
- [ ] Turn the planning route into a route across the map's tiles.
- [ ] Stop publishing the meeting reviews and summaries, and link each page to
      the meeting it rests on instead.
- [ ] Confirm the session map's four silent-failure notes in a procedure, then
      retire it in both repositories.
- [ ] Retire the private-preview walk form and its save service.
- [ ] Publish with `npm run export`, and update `docs/status.md` where an item
      changes.
