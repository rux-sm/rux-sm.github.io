---
type: plan
---

# Plan: Notes, a map you play through

## Goal

One tool rux uses to learn Infor LN, from any device.

**A simple, clean, minimal experience is the first requirement, not a finish
applied at the end.** Where a decision trades simplicity against completeness,
simplicity wins and this plan says what was left out.

**The map is the way in, and a tile is a level.** Every tile can be opened and
attempted, however well the library knows it. There is one verb — open a tile
and work through it — and it always ends the same way: a record reaches atlas
and the tile is fuller next time.

**Learning and filling gaps are the same act, not two.** What the tool collects
is evidence arriving, never knowledge verified: atlas decides what a source
settles, and a page changes only when its owning document does.

## Decisions

### The map is the way in

- **Home is the map.** It is the overview diagram, which already draws 26 tiles
  across six lanes. There is no route page and no syllabus: a hand-made order
  would only be a worse copy of the dependency the map already holds.

- **A line above the map says where to start**, changed whenever rux wants. A
  map with no starting point is one a beginner cannot use, and this is a line
  rather than a page.

- **A tile is a level: self-contained and not gated by another** — a thing you
  can take on, not a fixed sequence.

- **The map answers "where am I", not "tell me about horizons".** A subject
  cutting across tiles arrives through search or the glossary instead, and opens
  the screen or concept that owns it. Two questions, two doors.

### What a tile offers, and how you leave it

- **Three states, one verb.** **Known** — run the steps, with everything the
  library has about them and one understanding check at the end. **Partly
  known** — run what exists, and the holes are the quests, shown in place rather
  than hidden so the shape of what is missing is visible while working.
  **Empty** — the quest is to find anything at all: open the named screen, or
  read the help, the vendor guide or a recording.

- **A tile opens on one target, with its question inside.** Design ships
  `rux--popover` with a caret, so nothing is invented. The scheduler's bar has
  zones, but a tile already carries a name, a count and a quest badge, and zones
  are where minimal starts slipping.

- **Three ways a tile moves on, and they are not the same.** A **question** the
  learner answers — node 2 already asks *"Does on-hand cover it?"*, and its own
  note says nothing announces the answer. A **fork decided elsewhere**, like
  supply source purchase or job shop, which the item's setup chooses and the
  learner looks up. And a **single way on**, with nothing to ask. Rendering a
  fork as a choice would teach something false, so one asks what you found and
  the other what the item says. Answering draws the line and greys what it
  skips.

- **A tile that should ask but cannot is a quest**, which is how the map fills
  itself in: five tiles dead-end with no outcome written, two lookup nodes have
  no edges at all, and one fork has outcomes but no question.

- **A tile says which kind of work its holes need**, a trip into LN or a read at
  the desk. Of 175 open gaps 98 name a screen; sending rux into the environment
  for a question a PDF answers is the failure this prevents.

### Quests

- **A quest is an open gap written as something to do.** Thirty already read
  that way — "has never been opened" — and those are the first.

- **Each gap gains one authored field saying its kind:** capture it, mine it,
  resolve a disagreement, or verify a claim. **The kind cannot be inferred** — a
  keyword pass over the 175 open rows classified fewer than half. Tagging is done
  a tile at a time, as that tile is taken on.

- **A quest closes on evidence, never on effort.** Finishing one sends a record
  into the intake; atlas decides whether it settles anything. Nothing about the
  tool's own state can close a gap.

### Progress that cannot lie

- **A tile shows what it has, and separately what is open.** What it has —
  screens documented, steps written, phases walked — only grows. What is open is
  a count of quests, and it grows too whenever the library learns that it did
  not know something.

- **No percentage, ever.** A percentage needs a denominator, and nobody knows
  how much there is to know. A bar that falls because rux discovered a gap would
  punish exactly the thing this tool exists to encourage.

### What a reader meets

- **Three things in the side nav: Map, Procedures, Concepts.** The glossary is
  part of Concepts, not a fourth item: its 51 terms are generated from the
  concepts' own frontmatter, each with exactly one owner, so they are one body
  of content with two views.

- **Homework is not a destination.** Its sittings attach to the tiles they test,
  and the check arrives at the end of working through a tile. The seven-sitting
  curriculum was a hand-made ordering, and the map already orders by dependency.

- **A screen is a panel, not a destination**, which is atlas's own publishing
  test applied. It opens beside the step that names it and closes again, so a
  reader mid-task in LN never loses their place.

- **A screen still has an address**, so search and a link from atlas reach it.
  Arrived at directly it is a page; opened from a step it is the panel.

- **A concept publishes once rux has attested to it**, which is what OI-274
  asks. The first glossary carries only terms whose owner publishes.

- **One procedure type, and the outliers are left odd.** Splitting by kind was
  tested and the coupling rule inverted under measurement, because a process
  passes state through the ERP rather than through its prose.

### Saying where a fact came from

- **A label names what kind of fact a statement is, never how much to trust
  it**, because atlas's principle 3 is that there is no single ranking.

- **Scope before wording.** A source's reach is decided first: which section or
  row it covers, and what it inherits. A page says which sources it rests on,
  never implies every sentence has the same support, and where attribution is
  ambiguous it says so rather than picking.

- **A disagreement is shown, not resolved away.** Where the environment and the
  help conflict, both appear.

- **Field tables differ and the renderer must not assume**: Transfer Order
  Planning carries a Source column per row, Item Order Plan two columns under one
  section-level citation. `sources` already survives export as session codes, so
  page-level attribution needs no new field.

- **A phase walked in LN carries its own date**, which is what OI-275 asks.

- **atlas keeps its `status:` field**, which answers "is this finished" for the
  library. A label answers a different question for a reader.

### One intake, and what feeds it

- **One process, whatever the source:** a question, the source that can settle
  it, a proposed correction, rux's review, the owning document changes, then
  everything citing it is checked.

- **Walking is one feed, not the engine.** OI-008 records that field meanings are
  never closable by screenshots. Mining help, resolving contradictory sources and
  reviewing a recording are the others, and they need no environment time.

- **A correction has two signals, and the page shows both.** **Applied** when the
  owning document changed and rux can see the revision, which lands as soon as
  the review does. **Confirmed** when someone has since done it and it held,
  which arrives as a new quest on the tile. An empty inbox is not a result.

- **A tile's count grows only on confirmation**, so the number that means
  something is the one evidence backs.

- **The confirm quest matches the correction's kind**: fixed from a capture, go
  look again; from help, re-read it; a disagreement, check both sides still say
  what they said; a step, walk it. Confirming a step produces the walked date
  atlas already requires before calling a procedure approved.

- **Confirming is an offer, never a debt.** Reading and practising succeed
  without submitting anything, so a tile full of confirm quests is not homework
  owed.

- **How affected documents are found is decided per intake kind.** `fanout.py`
  answers for a capture and not for a corrected meaning.

- **The label publishes; the errand does not**, because the site is a curtain
  over a public repository and not a lock. The export tier is unchanged.

- **One queue page for the owner**, every quest in one list, ordered by priority
  and marked by which kind of work closes it.

### The site layout

- **A tile expands in place** into what its stage does, its procedures, its
  screens, its quests and its progress. No stage page and no new address.

- **On a phone the panel is a full-screen sheet** and back returns to the step it
  was opened from. The map becomes tiles by lane, each carrying what must come
  before it, where it branches and what follows.

- **A procedure puts its steps first**, each naming its screen as a chip, with
  the `What LN is doing` paragraph above the table.

- **One search box in the header**, over the library's own pages.

- **Pages are generated, with a few KB of behaviour** for the panel, search and
  the owner's live quests.

- **Accepted with keyboard and phone in mind**: focus returns from the panel to
  its step, long field tables stay readable, and nothing depends on telling grey
  from highlighted.

### Signing in, reviewing, walking

- **The owner's tools appear only for the owner.** A review box at the foot of
  every page records Approve, or Request changes with feedback; a review never
  edits a document, it enters the intake.

- **A walk follows the revision it was started on.** Resuming currently fetches
  the current procedure while the record keeps its older pinned commit, so
  answers can attach to steps the learner never saw. Either the pinned revision
  is loaded, or resuming is refused and a fresh run offered.

- **An investigation is a walk.** Same recording, same pull, same intake — not a
  second mechanism.

- **The data sits in five `platform.notes_*` tables and the private bucket
  `notes-walk-shots`**, readable and writable only by the owner.

- **atlas's `tools/pull.py`** brings each walk and everything else home, reading
  with the project's secret key kept in the Mac's Keychain.

### What retires, and how addresses survive

- **A retired page keeps its address and becomes a short landing** saying what it
  was and linking to what now holds its content. Nothing 404s.

- **Meeting reviews and summaries stop being pages**, becoming the sources a page
  cites and is read through.

- **Before a phase's long notes move**, its essential warnings are separated
  from its optional detail, and the essentials stay with the step.

- **The session map retires** once its four silent-failure notes are confirmed.

- **The private-preview walk form retires** when the online walk replaces it, and
  not before the revision defect above is fixed.

## Questions

- **What does a source establish, and how far does its reach extend?** Help can
  make a configuration claim; a recording holds both observed screen and
  unverified speech; a capture establishes what was visible, not every sentence
  citing it. The scope rule comes before any label wording.

- **What does clearing a capture attest, and who withdraws it?** Transcribing
  every field label is not review of every value, title bar and notification.
  Clearance is its own attestation, distinct from `transcribed`, and the upload
  path must refuse a capture without it. A ledger itself never publishes, at any
  tier. Capture release is evaluated on its own, after the first slice.

## Tasks

### First — one tile, worked through

- [ ] rux attests to `order-planning` and `planned-order`, the two concepts
      whose terms `run-order-planning-for-one-item` uses across its six phases.
- [ ] Simplify that procedure: separate its essential warnings from its optional
      detail, and move only the detail out.
- [ ] Decide the source scope rule, then label that tile at the levels its own
      documents support.
- [ ] Render the tile in the private preview: the procedure, its two concepts,
      the glossary of their terms, and `cprrp0520m000` as the screen panel.
- [ ] Attach one homework sitting as the tile's understanding check.
- [ ] Tag that tile's open gaps with their kind, and show them as its quests.
- [ ] Show what the tile has and what is open, with no percentage.
- [ ] Read it on desktop and on the phone, with the keyboard and back-button
      checks above.
- [ ] Answer in writing before extending: can rux find it unprompted; see what
      must exist first; read a field without losing their place; explain the
      result; send a correction worth acting on.

### Second — one quest, all the way through

- [ ] Fix the walk revision defect, then take one quest from the tile through a
      walk, the pull, the intake and a verified correction, ending where rux can
      see its outcome on the page.
- [ ] Time it, against what the same correction costs today. One number with no
      baseline proves nothing.

### Later, each on its own

- [ ] Build walking the map, after the first slice so it cannot obscure whether
      the content itself got easier to learn.
- [ ] Phrase the question on forks that have outcomes but none, write the five
      dead ends' outcomes, and connect the two lookup nodes.
- [ ] Evaluate capture release, once clearance is defined and atlas's evidence
      rule is amended.
- [ ] Tag the remaining gaps, tile by tile, as each is taken on.
- [ ] Attest the remaining concepts and carry the remaining screens through.
- [ ] Label, expand and score the other five lanes.
- [ ] Carry each phase's walked date into the export and show it.
- [ ] Add the header search over the library's own pages.
- [ ] Build the owner's queue page.
- [ ] Cut the side nav to Map, Procedures and Concepts.
- [ ] Simplify the other seven procedures, one at a time.
- [ ] Retire the meeting pages to landings that keep their addresses.
- [ ] Confirm the session map's four silent-failure notes, then retire it.
- [ ] Decide publication separately from rendering, and publish deliberately.
