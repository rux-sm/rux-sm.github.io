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
and work through it.

**Working through a tile can produce evidence or feedback for atlas.** Verified
contributions improve its content; reading and practice require no submission.
Finding nothing new, contradicting what is written, and being rejected are all
valid outcomes rather than failures. What the tool collects is evidence
arriving, never knowledge verified.

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

- **Three states, computed and never typed, each named for what it measures.**
  **No procedure** — no phase is associated, whatever reference the node has;
  the quest is to find anything to do, by opening the named screen or reading
  the help, a vendor guide or a recording. **Not verified** — phases exist, but a
  step is missing, a relevant gap is open, or the walk evidence is absent or
  invalid; run what exists, with the holes shown in place. **Verified** — every
  associated phase meets atlas's own requirement and the relevant gaps are
  closed; run the steps, with one understanding check at the end.

- **Verified means a covering walk file, not a date in the frontmatter**, which
  is atlas's own rule; a tile may not claim more than the library does. And
  **reference stays available in every state** — a node with rich screens and no
  procedure is not empty, and saying so would misdescribe the best-documented
  parts of the library.

- **A tile opens on one target, with its question inside.** Design ships
  `rux--popover` with a caret. The scheduler's bar has zones, but a tile already
  carries a name, a count and a quest badge, and zones are where minimal slips.

- **Three ways a tile moves on.** A **question** the learner answers — node 2
  already asks *"Does on-hand cover it?"* A **fork decided elsewhere**, like
  supply source purchase or job shop, which the item chooses and the learner
  looks up. And a **single way on**. Rendering a fork as a choice would teach
  something false, so one asks what you found and the other what the item says.
  Answering draws the line and greys what it skips.

- **An association is authored, and a session code only suggests.** Which
  phases a node opens is recorded in atlas; matching a code finds candidates and
  never decides ownership, because one session appears in several procedures and
  an issue against a screen is not relevant to every use of it. A quest keeps one
  identity however many tiles show it.

- **A tile that should continue but cannot is a quest, and the map already says
  which those are.** Its four shortage checkpoints are declared placeholders;
  its two lookups carry no edge *by design*, a detour where the walk is the same
  whether or not you take it, so they are linked in context and never given a
  dependency they do not have.

- **A tile says which kind of work its holes need**, a trip into LN or a read at
  the desk: 98 of 175 open gaps name a screen, and sending rux into the
  environment for what a PDF answers is the failure this prevents.

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

- **A tile shows current counts, each with its unit**, and every one of them may
  fall as well as rise: screens documented, steps written, phases walked, quests
  open. A redundant step is removed, wrong documentation is withdrawn, and a
  corrected phase loses its walked date until it is run again.

- **A cumulative tally, if one is ever wanted, is labelled contributions made**
  and never coverage. Only one of those two numbers describes the content.

- **No percentage, ever.** It needs a denominator nobody has, and a bar falling
  because rux found a gap would punish the thing this tool encourages.

### What a reader meets

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

- **Applied means the owning document changed**, and the page links the revision
  that carried it. A review enters the intake rather than editing anything, so
  Applied lands when the document does and not when the review is sent. An empty
  inbox is not a result.

- **A confirmation quest is raised only where the change leaves something
  specific unverified**, never as a second gate on every correction. Revised
  instructions have not been walked, so the affected phase is rerun; a wording
  fixed against a source that did not move was already verified during review
  and needs no second reading.

- **Confirming is an offer, never a debt**, and the walked date it produces is
  the one atlas already requires before calling a procedure approved.

- **How affected documents are found is decided per intake kind.** `fanout.py`
  answers for a capture and not for a corrected meaning.

- **The label publishes; the errand does not**, because the site is a curtain
  over a public repository and not a lock. The export tier is unchanged.

- **One queue page for the owner**, every quest in one list, ordered by priority
  and marked by which kind of work closes it.

### The site layout

- **A tile expands in place** into what its stage does, its procedures, its
  screens, its quests and its progress. No stage page and no new address.

- **A tile entered mid-procedure opens with what must already be true.** A short
  "Before starting" view is composed from the prerequisites the procedure itself
  names, each linking back to the step that satisfies it. Original step numbers
  are kept, so 4.5 still says it needs the cluster and site from 0.4 and the
  reader can reach it.

- **On a phone the panel is a full-screen sheet**, and back returns to the step
  it was opened from.

- **A procedure puts its steps first**, each naming its screen as a chip, with
  the `What LN is doing` paragraph above the table.

- **Pages are generated, with a few KB of behaviour** for the panel, search and
  the owner's live quests.

- **Accepted with keyboard and phone in mind**: focus returns from the panel to
  its step, long field tables stay readable, and nothing depends on telling grey
  from highlighted.

### Signing in, reviewing, walking

The owner's tools, their five tables, the private bucket and the pull command
are built; `notes/docs/owner-tools.md` describes them. What this plan changes:

- **A review enters the intake rather than editing anything.** It records
  Approve, or Request changes with feedback, and says what was last sent and
  whether atlas has it.

- **A walk follows the revision it was started on.** Resuming currently fetches
  the current procedure while the record keeps its older pinned commit, so
  answers can attach to steps the learner never saw. Either the pinned revision
  is loaded, or resuming is refused and a fresh run offered.

## Questions

- **What does a source establish, and how far does its reach extend?** Help can
  make a configuration claim; a recording holds both observed screen and
  unverified speech; a capture establishes what was visible, not every sentence
  citing it. The scope rule comes before any label wording.

- **How does a desk investigation, or a tile with no procedure, submit
  anything?** A walk pins an existing walkthrough and the generator refuses a
  subject without one. The slice does not need this — its test quest is tied to
  an existing procedure — but quests cannot reach all four kinds until it is
  answered.

- **What does clearing a capture attest, and who withdraws it?** Transcribing
  every field label is not review of every value, title bar and notification.
  Clearance is its own attestation, distinct from `transcribed`, and the upload
  path must refuse a capture without it. A ledger itself never publishes, at any
  tier. Capture release is evaluated on its own, after the first slice.

## Tasks

### First — one tile, worked through

- [ ] Fix the first tile as map node 5, **Generate Order Planning (Item)**
      (`cprrp1220m000`): record in atlas that it opens phases 3 to 5 of
      `run-order-planning-for-one-item`, and derive its counts and quests from
      that record rather than from the code. Its lookup panel is
      `cprrp0520m000`, the detour the map already places beside it.
- [ ] Build its "Before starting" view from step 0.4's cluster and site, step
      0.6's plan data, phase 1's demand — step 4.1 looks for that sales order
      row — and phase 2's horizon. Each links back to the step that satisfies
      it.
- [ ] Take **sitting 4, horizons, time fences and run scope** as the tile's
      understanding check: it is the only one of the eight naming this node's
      own session.
- [ ] rux attests to `order-planning` and `planned-order`, the two concepts
      whose terms those phases use.
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
      result; send a correction worth acting on; and reach the tile cold, at
      node 5, without having opened the whole procedure first.

### Second — one quest, all the way through

- [ ] Fix the walk revision defect, then take one quest from the tile through a
      walk, the pull, the intake and a verified correction, ending where rux can
      see its outcome on the page.
- [ ] Time it, against what the same correction costs today. One number with no
      baseline proves nothing.
