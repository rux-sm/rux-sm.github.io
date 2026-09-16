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

### The route is the map, walked

- **There is no route page.** A linear syllabus over a process that branches
  would be an invention laid on top of data that already says more. The map
  holds seven decision points with labelled outcomes, and one of them already
  carries an explicit skip: *is stock available* answers YES and jumps three
  stages straight to shipping, or NO and continues into planning, which then
  branches again on supply source.

- **Choosing an outcome walks the map.** Pick a shipment, answer the question at
  each decision, and the path lights up while the tiles that no longer apply
  grey out. Answering by hand is the point: the decision is the teaching.

- **Any tile is a starting point**, and its prerequisites are the arrows coming
  into it: start at planning rather than at a sales order and the tool says what
  it assumes already exists. No ordering is written by hand, so none can drift
  from the map.

- **A learning unit is composed, never a new class**: the outcome, what must
  exist first, the procedure, the expected result, one understanding check, and
  where the path goes next — assembled from what exists.

- **A tile with no procedure behind it says so.** The map has 26 tiles and eight
  procedures, so most tiles open to screens, ideas and open questions with
  nothing yet to walk. That is the honest state and it is the gap made visible,
  not a hole to hide.

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

- **The export emits the kind of a source, never its filename.** Sources are
  stripped today because they are filenames, which are internal paths. A kind —
  `help`, `capture`, `meeting`, `vendor` — is the label itself, leaks nothing,
  and is derived from the string an author already wrote.

- **Three levels of provenance, all of them things that already exist:** the
  document's `sources` list, a section's capture dates, and the Source column
  already authored on every field row of a screen page. Nothing per-claim is
  invented; the export stops throwing away what the author did.

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

- **The side nav keeps Map, Procedures, Ideas, Glossary and Homework.**
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
  `walks/` and the rest into `inbox/`, then marks them pulled; atlas refuses a
  commit while the inbox holds anything. It reads with the project's secret key,
  kept in the Mac's Keychain.

### Showing a capture, and the gate that allows it

- **atlas's rule that evidence never leaves is amended, narrowly.** Its reason
  was the public site, not privacy in general. A screen is worth more to a
  visual reader than a table describing it, and atlas is private.

- **The ledger is the release gate.** A ledger already transcribes one capture,
  lists every field label legible on the frame, and is signed by the person who
  read it — so that person has looked at every part of that image. A capture may
  leave only when its ledger exists and marks it clear.

- **Why a gate and not a sweep:** every other publishable check is a regex over
  text and no regex reads an image, and a capture carries item codes, partner
  names and user names that only a person will catch. A cleared one goes to the
  private bucket, shown to a signed-in owner through a link the database signs,
  never to the public tier.

- **This paces itself, and that is accepted.** Nineteen of 147 captures have a
  ledger, so most frames cannot be shown yet. Writing a ledger is work that
  already has value, and tying release to it adds no new chore.

- **A ledger's transcription publishes as text today**, swept like everything
  else, so every field label legible on a frame is readable before any image
  moves.

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

None open.

## Tasks

### First — one procedure, proved end to end

- [ ] rux attests to the two ideas `run-order-planning-for-one-item` rests on.
- [ ] Simplify that procedure: separate its essential warnings from its optional
      detail, move only the detail out.
- [ ] Publish it with its two ideas, its screens as panels, the glossary, and
      its homework as the understanding check.
- [ ] Label at page and section level, with disagreements shown.
- [ ] Make its stretch of the map walkable: answer the decision, watch the path
      light up and the skipped tiles grey out, and start from a tile mid-way.
- [ ] Show one cleared capture on its screen panel, to prove the ledger gate.
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

- [ ] Amend atlas's evidence rule and write the ledger's clear mark into it.
- [ ] Emit each source's kind, and label field rows from it.
- [ ] Attest to the remaining ideas and carry the remaining screens through.
- [ ] Label, tile and expand the other five lanes.
- [ ] Carry each phase's walked date into the export and show it.
- [ ] Build the phone view carrying what comes before, where it branches, and
      what follows.
- [ ] Add the header search over the library's own pages.
- [ ] Build the owner's queue page, marked by which feed can close each item.
- [ ] Cut the side nav to Map, Procedures, Ideas, Glossary and Homework.
- [ ] Simplify the other seven procedures, one at a time.
- [ ] Turn the planning route into a route across the map's tiles.
- [ ] Retire the meeting reviews and summaries to landing pages that keep their
      addresses.
- [ ] Confirm the session map's four silent-failure notes, then retire it.
- [ ] Retire the private-preview walk form and its save service.
- [ ] Publish with `npm run export`, and update `docs/status.md` where an item
      changes.
