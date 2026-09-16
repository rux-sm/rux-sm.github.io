---
type: plan
---

# Plan: Notes, a tiled learning tool

## Goal

One tool rux uses to learn Infor LN, from any device.

**A simple, clean, minimal experience is the first requirement, not a finish
applied at the end.** Where a decision trades simplicity against completeness,
simplicity wins and the plan says what was left out. A reader meets four
things — the map, a procedure, an idea, the glossary — and a screen opens beside
the step that needs it.

**Every task in the tool does two jobs: it teaches rux, and it produces the
material that closes a gap.** Answering a question, walking a procedure or
sending a correction all feed one intake process. What the tool collects is
evidence arriving, never knowledge verified: atlas decides what a source
settles, and the page changes only when the owning document does.

## Decisions

### What a reader meets

- **Four destinations: the map, a procedure, an idea, the glossary**, and
  **homework**, which has its own entry in the side nav rather than being
  reachable only from a page that happens to mention it.

- **A screen is a panel, not a destination.** atlas's publishing test is that a
  page is what someone sits down and reads, and reference consulted while
  walking such a page is not. Nobody sits down to read a screen file. It opens
  beside the step that names it and closes again, so a reader mid-task in LN
  never loses their place.

- **A screen still has an address**, so search and a link from atlas reach it.
  Arrived at directly it is a page; opened from a step it is the panel.

- **The glossary publishes.** 51 terms, each owned by exactly one idea file,
  already generated and rule-checked, and never seen by a reader.

- **An idea publishes once rux has attested to it**, which is what OI-274 asks,
  and the glossary emits with the class.

- **One procedure type, and the outliers are left odd.** Splitting by kind was
  tested: the size rule is arbitrary, and the coupling rule inverted under
  measurement, because a process passes state through the ERP rather than
  through its prose. The data was the real problem and it has moved.

### The route through it

- **The map gives context; a route gives an order.** The map answers "where does
  this sit", and a beginner's first question is "what do I learn next". A short
  route, ordered by what must exist before what, answers it. atlas's principle 8
  already says teach by dependency, never alphabetically and never by the menu;
  this applies it.

- **A learning unit is composed, never a new class.** Each one names its
  outcome, its prerequisites, a short explanation, the procedure, the expected
  result, one understanding check, and the next step — assembled from the idea,
  procedure and homework that already exist.

- **The route is one page, and it is short.** It is not a syllabus of
  everything; it is the path from nothing to a shipment.

### Saying where a fact came from

- **A label names what kind of fact a statement is, never how much to trust
  it.** atlas's principle 3 is that there is no single ranking — a capture
  settles configuration, help settles meaning — and treating one as universally
  stronger is the named cause of the previous library's errors.

- **Five labels, kept short because they repeat down every page:** **Deployed**
  with its date, read off this environment; **Meaning**, from Infor's help or a
  vendor guide; **Walked** with its date, performed here; **Unverified**, said
  in a meeting and not checked; and **Not known**.

- **A disagreement is shown, not resolved away.** Where the environment and the
  help conflict, both appear. atlas already logs these, and a visible
  contradiction teaches more than a tidy answer.

- **Labels start where the contract already supports them.** The export carries
  `sources` per document and strips the per-claim `sources` blocks at the export
  tier, so a page and a section can be labelled today and a single claim cannot.
  Per-claim labelling needs a contract change and is not assumed here.

- **A phase walked in LN carries its own date**, which is what OI-275 asks for.

- **atlas keeps its `status:` field.** It answers "is this finished" for the
  library, and its rule 6 computes it. A label answers a different question for
  a reader. Neither replaces the other.

- **Approved stops being a badge.** rux's review verdict lives in the review
  box, not as a second badge.

### One intake, and what feeds it

- **One process, whatever the source:** a question, then the source that can
  actually settle it, then a proposed correction, then rux's review, then the
  owning document changes, then everything that cites it is checked.

- **Walking is one feed, not the engine.** Some gaps cannot be closed by
  walking at all — OI-008 records that field meanings are never closable by
  screenshots. Mining help, resolving contradictory sources, reviewing a
  recording and correcting an explanation are the other feeds, and they need no
  environment time.

- **The tool collects; atlas verifies.** A saved answer, an uploaded screenshot
  or a sent correction never marks anything verified, and never changes a
  label on its own.

- **A partial page publishes with its holes in place.** Four known steps of
  seven beat none, and the shape of what is missing is worth seeing.

- **A gap says what would settle it** — which source answers it, and what to
  look for — not merely that something is unknown.

- **The label publishes; the errand does not.** The export tier carries no issue
  ids, no evidence stamps and no paths into the library, because the site is a
  curtain over a public repository and not a lock. Not known shows to anyone;
  the issue and the errand only to the owner, read live.

- **One queue page for the owner**, ordered by the issue's priority and then by
  how many documents cite what would settle it, and marked by which feed can
  close it, so desk work and environment work are not muddled.

### The site layout

- **Home is the map**, full width, no side nav open. It is the overview diagram,
  which already draws 26 tiles across six lanes with the arrows that carry the
  branches and feeds.

- **A tile is `rux--tile--expandable`, and expanding it is the stage**, holding
  what the stage does, its procedures, its ideas and its open questions. There
  is no stage page and no new address.

- **The phone view keeps the relationships, not just the tiles.** A swim-lane
  diagram at 402px is unreadable, but a plain grid by lane throws away the
  arrows this plan calls the process logic. Each tile carries what must come
  before it, where it branches, and what follows.

- **A procedure puts its steps first**, each step naming its screen as a chip
  that opens the panel, with the `What LN is doing` paragraph above the table.

- **The side nav keeps Route, Map, Procedures, Ideas, Glossary and Homework.**
  Screens are not in it.

- **One search box in the header**, over the library's own pages.

- **Pages are generated, with a few KB of behaviour** for the panel, search and
  the owner's live gaps. The renderer brief revisits its own build-time argument
  and says a hybrid is right once anything is interactive.

### Signing in, reviewing, walking

- **The owner's tools appear only for the owner.** Anyone else with Notes ticked
  sees the published pages and nothing else.

- **A review box at the foot of every page** records Approve, or Request changes
  with feedback, and says what was last sent and whether atlas has it. A review
  never edits a document; it enters the intake.

- **Homework answers save to rux's account**, and the browser copy stays for
  anyone who is not the owner. The newer copy wins when a page opens.

- **The walk page walks a published procedure.** Each answer saves as it is
  left, screenshots upload from any device, only today's walks are offered to
  continue, and the walk pins the atlas commit the pages were built from.

- **The data sits in five `platform.notes_*` tables and the private bucket
  `notes-walk-shots`**, readable and writable only by the owner. Each database
  change is a named migration shown to rux and applied on a yes.

- **A pull command on the Mac, atlas's `tools/pull.py`,** writes each walk into
  `walks/` and the rest into `inbox/`, then marks them pulled. Atlas refuses a
  commit while the inbox holds anything.

- **The pull reads with the project's secret key, kept in the Mac's Keychain.**

### What retires, and how addresses survive

- **A retired page keeps its address and becomes a short landing** saying what
  it was and linking to the pages that now hold its content. Nothing 404s, and
  no bookmark or atlas link breaks.

- **Meeting reviews and summaries stop being pages.** Their three parts each
  have a better home: steps in a procedure, open items in the queue, and what
  was discussed in the idea and screen files.

- **Before a phase's long notes move**, its essential instructions and warnings
  are separated from its optional reference detail. The essentials stay with the
  step; only the detail moves to the screen or idea that owns it.

- **The planning route stops being its own document** and becomes a route across
  the map's tiles.

- **The session map retires** once its four silent-failure notes are confirmed
  in a procedure.

- **The private-preview walk form retires** when the online walk replaces it.

## Questions

- **Does atlas's rule that evidence never leaves change, and for which subset?**
  Showing a capture on a page needs that rule amended in atlas on its own terms,
  with a permitted subset and an access lifetime. Until then no capture is
  uploaded and none is shown; this plan assumes it stays as it is.

- **What must the export contract carry for a claim to be labelled?** Today it
  carries sources per document and strips them per claim, so section-level is
  the honest limit. Going finer is a contract change with its own cost.

- **What is the first route, and who says so?** The order must be rux's, because
  only rux knows what they need next. A candidate: test items, then order
  planning, then the planned-order boundary, then a shipment.

## Tasks

### First — one procedure, proved end to end

- [ ] rux attests to the two ideas `run-order-planning-for-one-item` rests on.
- [ ] Simplify that procedure: separate its essential warnings from its optional
      detail, move only the detail out.
- [ ] Publish it with its two ideas, its screens as panels, the glossary, and
      its homework as the understanding check.
- [ ] Label at page and section level, with disagreements shown.
- [ ] Preview it on desktop and on the phone before anything else is built.
- [ ] Answer these, in writing, before extending: can rux find it without being
      told where it is; can rux see what must exist first; can rux read a field
      without losing their place; can rux explain the result afterwards; can rux
      send a correction that is worth acting on.

### Second — one correction, all the way through

- [ ] Send one real correction from the page, take it through the intake, verify
      it against the source that can settle it, update the owning document, and
      check everything that cites it.
- [ ] Record how long that took and what was awkward. That number decides
      whether the loop is worth extending.

### Third — extend what held

- [ ] Build the route page, in the order rux gives.
- [ ] Attest to the remaining ideas and carry the remaining screens through.
- [ ] Label, tile and expand the other five lanes.
- [ ] Carry each phase's walked date into the export and show it.
- [ ] Build the phone view carrying what comes before, where it branches, and
      what follows.
- [ ] Add the header search over the library's own pages.
- [ ] Build the owner's queue page, marked by which feed can close each item.
- [ ] Cut the side nav to Route, Map, Procedures, Ideas, Glossary and Homework.
- [ ] Simplify the other seven procedures, one at a time.
- [ ] Turn the planning route into a route across the map's tiles.
- [ ] Retire the meeting reviews and summaries to landing pages that keep their
      addresses.
- [ ] Confirm the session map's four silent-failure notes, then retire it.
- [ ] Retire the private-preview walk form and its save service.
- [ ] Publish with `npm run export`, and update `docs/status.md` where an item
      changes.
