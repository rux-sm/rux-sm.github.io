---
type: plan
---

# Plan: a tiled learning tool — map, do it, look it up

## Goal

Notes is one learning tool a beginner can use without being told how it is
organised. Three kinds of page answer the only three questions anyone asks —
where am I, how do I do this, what is this thing — and tiles are how you move
between them. Every claim says where it came from, every gap says what would
settle it, and a gap is shown on the screen you are already standing on, so
using the tool is what fills it in.

## Decisions

### The three kinds

- **Three kinds of page and no others: the map, a procedure, a reference
  page.** A screen and an idea are both reference — same shape, same job — so a
  reader never has to know which word atlas uses for which.

- **The map is the overview diagram, not a new page.** It already draws 26
  tiles across six lanes with the arrows that carry the branches and feeds, and
  those arrows are the process logic; a flat grid would throw them away. The
  change is that a tile becomes a door and carries how much we know.

- **A procedure is one outcome, its steps, and one short "What LN is doing"
  paragraph per phase.** Nothing else. The long phase notes move out.

- **A reference page has one shape for both subjects**: what it is, where you
  reach it, what its fields or terms mean, where you meet it, and what we do not
  know about it. A screen fills the field table; an idea fills the terms.

- **Reference pages are reached, never browsed.** You arrive from the stage that
  owns the screen, from a step that uses it, or by search. They are not in the
  side nav. This is what lets all 136 publish without the tool stopping being
  simple.

### The site layout

- **Home is the map, full width, with no side nav open.** A tile is
  `rux--tile--clickable`; `rux--tile--expandable` with
  `rux--tile-content__below-the-fold` gives the stage summary on the tile
  itself before you commit to opening it. No `rux--` class is invented, and a
  bare tile is used rather than one inside `layer-two`, which Design records as
  invisible on a plain page.

- **On a phone the diagram becomes one tile per node, grouped by lane.** A
  swim-lane diagram at 402px is unreadable, and both views are built from the
  same nodes, so neither can drift.

- **A tile opens its stage**: one paragraph on what the stage does, then tiles
  for its procedures, its screens, its ideas, and its open questions. The stage
  is part of the map, not a fourth kind.

- **A procedure page puts its steps first**, each step naming its screen as a
  chip that opens the reference page beside it. Phase explanation above the
  step table, as it is today.

- **One search box reaches every reference page**, in the header. It is the only
  way to arrive at a screen whose stage you cannot guess.

- **The side nav keeps two groups: Map and Procedures.** The Reference and
  Concepts groups it builds today do not return, because a nav listing 136
  pages is the thing a visual reader cannot scan.

- **Every page keeps its address.** A reader's bookmark and a link from atlas
  both survive the change.

### Grades, in place of Draft and Approved

- **Four grades on every page and every claim that carries its own sources:**
  **Seen here** with the date someone opened it in this environment,
  **Documented** where Infor's help says so, **Heard** where a meeting said so
  and nobody has checked, and **Not known**.

- **A grade is worked out from the sources a claim rests on and never typed.**
  Atlas already ranks its sources this way for its own authority rules, and
  already computes capture dates per section in `build/coverage.md`, which no
  reader has ever seen.

- **A tile shows the mix underneath it**, as a strip rather than a word. So the
  map answers "where am I" for a beginner and "what do we know so far" for rux,
  from one page that cannot drift from the pages it counts.

- **Approved stops being a badge.** rux's own review verdict stays in the review
  box, per `docs/plans/notes-online.md`, and is not a second badge beside the
  grade.

### Gaps

- **A partial page publishes with its holes in place.** A procedure with four of
  seven steps known shows the four and marks the other three, because the shape
  of what is missing is itself worth seeing.

- **A gap says what would settle it** — which screen answers it and what to
  capture there — not merely that something is unknown.

- **The grade publishes; the errand does not.** The export tier still carries no
  issue ids, no evidence stamps and no paths into the library, because the site
  is a curtain over a public repository and not a lock: a page fetched with no
  login returns in full, measured 2026-09-15. So a page shows **Not known** to
  anyone, and shows which issue it is and what to capture only to the owner,
  read live when signed in, the same way the review box works.

- **One queue page, for the owner**, listing every open question ordered by how
  much it would unblock, so an hour in LN has a shopping list. It is not part of
  the published set.

### Evidence and search

- **Evidence stays in git, and the bucket is a publishing target rather than a
  new home.** atlas is a private repository, so nothing is exposed by keeping
  it; moving files out would not shrink the history, which keeps every blob;
  and one source of truth is the rule everywhere else here. The export uploads
  a copy of each capture a published page shows, the way it already emits JSON.

- **A reference page shows its capture to a signed-in owner**, through a link
  the database signs on request, never a public address. This is why the copy
  exists at all: git cannot serve a file to a page.

- **Search covers the library's own pages.** It needs no bucket and no
  licensing call, and those pages are written for the reader rather than by the
  vendor, which is most of the value.

- **Searching Infor's help is its own later decision.** The text of all 117
  help documents is already extracted locally and is what principle 6 greps, so
  the work is small; the question is licensing, not technique.

### What retires

- **Meeting reviews and summaries stop being pages.** They become the sources a
  page cites and is read through. Nobody learns this from a record of what was
  said on one morning in August.

- **The session map retires** once its four silent-failure notes are confirmed
  in a procedure.

- **The planning route stops being its own document** and becomes a route across
  the map's tiles.

- **Homework stays**, as the one output about the learner rather than the
  knowledge, with its answer key carrying the same four grades.

## Questions

None open.

## Tasks

### First slice — the Enterprise Planning lane, end to end

- [ ] Carry the seven Enterprise Planning nodes' screens and ideas through the
      export and render the one reference page shape for both.
- [ ] Work out the four grades for those pages from their sources, carry them
      through the export, and show them in place of Draft and Approved.
- [ ] Make those seven map tiles clickable, each carrying its mix, each opening
      a stage page.
- [ ] Give the two planning procedures step chips that open their reference
      pages.
- [ ] Show their gaps in place: the grade to everyone, the issue and the capture
      errand to the owner only, read live.
- [ ] Use the slice for a week before building the rest, and record here what it
      got wrong.

### The rest, once the slice holds

- [ ] Carry the remaining screens and ideas through the export.
- [ ] Grade, tile and link the other five lanes.
- [ ] Build the phone view: one tile per node, grouped by lane.
- [ ] Add the header search over every reference page, the library's own only.
- [ ] Upload each published page's captures to the private bucket at export,
      and show one to a signed-in owner through a signed link.
- [ ] Cut the side nav to Map and Procedures.
- [ ] Build the owner's queue page, ordered by what each answer would unblock.
- [ ] Move Ship from stock's long phase notes into the screen or idea page that
      owns each, then the other seven one at a time.
- [ ] Turn the planning route into a route across the map's tiles.
- [ ] Stop publishing the meeting reviews and summaries, and link each page to
      the meeting it rests on instead.
- [ ] Confirm the session map's four silent-failure notes in a procedure, then
      retire it in both repositories.
- [ ] Publish with `npm run export`, and update `docs/status.md` where an item
      changes.
