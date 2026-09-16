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

- **Three kinds of page and no others: the map, a procedure, a reference
  page.** A screen and an idea are both reference — same shape, same job — so a
  reader never has to know which word atlas uses for which.

- **Tiles are the navigation, all the way down.** The map is tiles by stage, a
  stage opens to tiles for its procedures and its screens, and a procedure's
  steps name their screens as tiles. There is no list of 136 links, because a
  list that long is the thing a visual reader cannot scan.

- **Reference pages are reached, never browsed.** You arrive at a screen from
  the stage that owns it, from a step that uses it, or by search. This is what
  lets all 124 publish without the tool stopping being simple.

- **Four grades replace Draft and Approved**, on every page and every claim
  that carries its own sources: **Seen here** with the date someone opened it in
  this environment, **Documented** where Infor's help says so, **Heard** where a
  meeting said so and nobody has checked, and **Not known**. The grade is worked
  out from the sources a claim rests on and is never typed by hand.

- **A tile shows the mix underneath it.** So the map answers "where am I" for a
  beginner and "what do we know so far" for rux, from one page that cannot drift
  from the pages it counts. `build/coverage.md` in atlas already measures most
  of this and no reader has ever seen it.

- **A partial page publishes with its holes in place.** A procedure with four of
  seven steps known shows the four and marks the other three, because the shape
  of what is missing is itself worth seeing. Nothing is withheld for being
  incomplete.

- **A gap says what would settle it**, not merely that something is unknown:
  which screen answers it and what to capture there. A gap nobody can act on is
  a complaint.

- **The grade publishes; the errand does not.** The export tier still carries no
  issue ids, no evidence stamps and no paths into the library, because the site
  is a curtain over a public repository and not a lock. So a page shows **Not
  known** to anyone, and shows which issue it is and what to capture only to the
  owner, read live when signed in, the same way the review box works.

- **One queue page, for the owner.** Every open question in one list, ordered by
  how much it would unblock, so an hour in LN has a shopping list. It is not
  part of the published set.

- **Meeting reviews and summaries stop being pages.** They become the sources a
  page cites and is read through, not things a learner browses. Nobody learns
  this from a record of what was said on one morning in August.

- **Homework stays, as the one output about the learner rather than the
  knowledge.** It publishes with its answer key labelled by the same four
  grades.

- **Walkthroughs become procedures and the long phase notes move out**, into
  the screen or idea page that owns each, so a procedure is scannable while
  standing in LN. This was already decided and is unchanged.

- **The planning route stops being its own document** and becomes a route
  across the map's tiles. Unchanged.

- **The session map retires** once its four silent-failure notes are confirmed
  in a procedure. Unchanged.

## Questions

- **Do the 119 MB of evidence move out of git and into the private bucket?**
  Every screenshot, help PDF and vendor guide is committed forever and cannot be
  removed without rewriting history, and git is also the one place they can
  never be served from. The bucket is both the lighter home and the only route
  to the question below. This is atlas-only work and would get its own plan
  there; the answer decides whether reference pages can show a capture.

- **Should a signed-in owner be able to open the help and the captures behind a
  reference page?** It needs the evidence move above, and it is a licensing
  question about Infor's material as much as a technical one, so it is rux's
  call and not a default.

- **Do meeting summaries really stop publishing?** The plan above says yes and
  the previous plan said they stay as one of five outputs. They are a real
  record; they are just not a learning output.

## Tasks

- [ ] Publish the reference pages: carry the 124 screen files and 12 idea files
      through the export, and render one reference page shape for both.
- [ ] Work out the four grades from each claim's sources, carry them through the
      export, and show them in place of Draft and Approved.
- [ ] Build the map as tiles by stage, each tile showing the mix underneath it,
      opening to the procedures and screens it owns.
- [ ] Make a procedure's steps name their screens as tiles that open the
      reference page.
- [ ] Show a gap where the reader meets it: the grade to everyone, the issue and
      what to capture to the owner only, read live.
- [ ] Build the owner's queue page, ordered by what each answer would unblock.
- [ ] Move Ship from stock's long phase notes into the screen or idea page that
      owns each, as the trial, then the other seven one at a time.
- [ ] Turn the planning route into a route across the map's tiles.
- [ ] Stop publishing the meeting reviews and summaries, and link each page to
      the meeting it rests on instead.
- [ ] Confirm the session map's four silent-failure notes in a procedure, then
      retire it in both repositories.
- [ ] Publish with `npm run export`, and update `docs/status.md` where an item
      changes.
