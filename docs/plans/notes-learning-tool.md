---
type: plan
---

# Plan: Notes, a map you play through

## Goal

One tool rux uses to learn Infor LN, from any device.

**A simple, clean, minimal experience is the first requirement, not a finish
applied at the end.** Where a decision trades simplicity against completeness,
simplicity wins and this plan says what was left out.

**The path is the way in, and a tile is a level.** Everything a learner does
starts from a tile: reading the steps, walking them in LN, the homework check,
and the quests. Every tile can be opened and attempted, however well the
library knows it. There is one verb — open a tile and work through it.

**Build everything the library can show now, and let the gaps be quests.** A
missing step, screen or answer never holds a tile back; it shows as a quest in
place, and the tile fills in as walks, captures and reviews arrive.

**Working through a tile can produce evidence or feedback for atlas.** Verified
contributions improve its content; reading and practice require no submission.
Finding nothing new, contradicting what is written, and being rejected are all
valid outcomes rather than failures. What the tool collects is evidence
arriving, never knowledge verified.

## Decisions

### The path is the way in

- **Home is the path: the overview's 26 tiles as one column, top to bottom,**
  live on the site. The numbered tiles run in walk order under their stage, the
  setup tiles come first under "Before you start", and each unnumbered tile and
  each task that varies a step sits indented under the tile it belongs to. It reads the same on a phone, and the
  order is the overview's own numbering, so there is no hand-made syllabus.

- **The diagram stays one link away**, for seeing how the modules connect.

- **A line above the path says where to start**, changed whenever rux wants.

- **A tile is a level: self-contained and not gated by another.**

- **The path answers "where am I", not "tell me about horizons".** A subject
  cutting across tiles arrives through search or the glossary instead, and opens
  the screen or concept that owns it.

- **The side nav is Path, Map and Concepts**, with Quests for the owner, and
  a search box above the path keeps the tiles whose steps, screens or quests
  match. Meeting summaries stay listed until their pages become the sources a
  page cites. The glossary is part of Concepts: its terms are generated from the
  concepts' own frontmatter, each with exactly one owner.

- **Walkthroughs are the steps a tile opens, and concepts are the detail.** A
  walkthrough stays atlas's source for the steps; its page leaves the nav. A
  concept answers "what does this mean" from a word in a step, and a screen
  answers "what is on this screen" from the step that names it.

### Tasks beside the path

- **A task that changes what happens at a step sits beneath that step**, such
  as cancelling a production order under Production Orders. **A task that
  stands on its own is an Other task**, such as a cycle count, shown behind a
  Path | Other tasks switch and grouped by module.

- **Tasks live in atlas's `maps/tasks.md`**, tiles like the overview's; a task
  names the tile it varies with Under. A task with no written steps carries a
  gap, which is its quest.

- **Quality is in, and its quests decide whether it stays.** Invoicing and
  finance are out.

- **rux names a new task and it is added as an empty tile** with its menu
  route from the navigation extract.

### A tile, closed and open

- **A closed tile is its number, its name, one line of what it does, and a quest
  count when it has quests.** The whole tile is one target.

- **An open tile is the same tile grown into one card, in place:** a short
  "Before starting" list, what LN is doing, the steps of the phases it opens,
  how to move on, and its quests. There is no stage page and no new address.

- **"Before starting" lists the steps this tile's steps point back at**, as
  atlas emits them, each linking to the tile that does it. Original step numbers
  are kept, so 4.5 still points at the cluster and site from 0.4.

- **A screen opens inside the card, under the first step that names it**: its
  route and purpose from atlas's screen reference, so a reader mid-task never
  loses their place. A page of its own waits until a screen has more to show.

- **Three ways a tile moves on.** A **question** the learner answers, like node
  2's *"Does on-hand cover it?"* A **fork decided elsewhere**, like supply
  source purchase or job shop, which the item chooses and the learner looks up.
  And a **single way on**. Answering opens the next tile and greys what it
  skips.

- **Homework is not a destination.** A tile names the sittings that test it
  with atlas's Check field, and they close the open tile; a sitting that spans
  tiles sits on the tile where it starts. Preparation and report-back sections
  stay on the experiment page.

- **Walking happens in the tile.** An open tile has Walk this, which records
  what happened at each step and its screenshots into the same walk tables, so
  the pull is unchanged. The walk page's address is a landing that points to
  it, and the private preview has no walk form.

### What a tile knows

- **Three states, computed and never typed.** **No procedure** — no phase is
  associated; the tile shows its screens and reference, and its quest is to find
  something to do. **Not verified** — phases exist, but a step is missing, a
  relevant gap is open, or the walk evidence is absent; run what exists, with
  the holes shown in place. **Verified** — every associated phase has a
  covering walk file and the relevant gaps are closed.

- **An association is authored, and a session code only suggests.** Which
  phases a node opens is recorded in atlas; matching a code finds candidates and
  never decides, because one session appears in several procedures. A node with
  no association yet is a No procedure tile, not a missing one.

- **A tile shows current counts, each with its unit**, and every one may fall as
  well as rise: screens documented, steps written, phases walked, quests open.
  **No percentage, ever**, because a bar falling when rux finds a gap would
  punish the thing this tool encourages.

- **One procedure type, and the outliers are left odd**, because a process
  passes state through the ERP rather than through its prose.

- **A concept shows once rux has attested to it**, which is what OI-274 asks;
  the glossary grows with the attestations.

- **A phase walked in LN carries its own date**, which is what OI-275 asks.

### Quests

- **A quest is an open gap written as something to do**, shown on every tile the
  gap is relevant to, with one identity however many tiles show it.

- **A quest says which kind of work closes it:** capture it in LN, mine the help,
  resolve a disagreement, or verify a claim. The kind is authored in the fifth
  column of atlas's `issues.md`, because a keyword pass over the open gaps
  classified fewer than half. An untagged issue's quest shows as Untagged.

- **The overview's placeholders are quests already.** Its four shortage
  checkpoints show as tiles with their quest; its two lookups stay detours with
  no dependency.

- **A quest closes on evidence, never on effort.** Finishing one sends a record
  into the intake; atlas decides whether it settles anything.

- **One quests page for the owner**, every quest in the order the path shows
  its tile, marked by the kind of work that closes it.

### The tools column

- **A tools column sits on the right of the path**, following the open tile:
  a notepad, screenshot upload and document upload first, with room for more
  tools later. On a phone it drops below the path.

- **Notes and uploads are saved to the account**, like a walk's screenshots, so
  every device sees them. **Each has a Send for review button**; nothing reaches
  atlas until rux presses it. This is also how a desk investigation or a tile
  with no procedure submits anything.

- **An upload stays private.** A screenshot is never published from here
  until rux clears it.

- **Clearing a screenshot is rux's own attestation, separate from
  `transcribed`:** rux has checked the whole image, its values, title bar and
  notifications included, and nothing in it identifies a person, an
  environment, a client or a vendor document. Only rux clears one, rux can
  withdraw it at any time, and a withdrawn screenshot leaves the site with the
  next publish.

### One intake, and what feeds it

- **One process, whatever the source:** a question, the source that can settle
  it, a proposed correction, rux's review, the owning document changes, then
  everything citing it is checked.

- **Walking is one feed, not the engine.** Mining help, resolving contradictory
  sources and reviewing a recording are the others, and they need no
  environment time.

- **Applied means the owning document changed**, and the page links the revision
  that carried it. A review enters the intake rather than editing anything.

- **A confirmation quest is raised only where a change leaves something
  specific unverified**, such as revised steps, which are rerun; confirming is
  an offer, never a debt.

- **How affected documents are found is decided per intake kind.** `fanout.py`
  answers for a capture and not for a corrected meaning.

- **The label publishes; the errand does not**, because the export tier is
  unchanged.

### Saying where a fact came from

- **Labels come after the path, not before it.** A page first says which sources
  it rests on, as `sources` already allows, and a label per statement follows.

- **Three labels, each covering only what its source shows:** *Seen in LN* for
  a walk, a capture or the screen in a recording, which establishes what was
  visible and not every sentence citing it; *From help* for how LN is meant to
  work, a configuration claim included; and *Said in a meeting* for speech,
  including a recording's, which is unchecked.

- **A label names what kind of fact a statement is, never how much to trust
  it**, and a disagreement between the environment and the help shows both.

- **Field tables differ and the renderer must not assume**: Transfer Order
  Planning carries a Source column per row, Item Order Plan two columns under
  one section-level citation.

### What retires

- **A retired page keeps its address and becomes a short landing** saying what
  it was and linking to what now holds its content. Nothing 404s.

- **Meeting reviews and summaries stop being pages**, becoming the sources a page
  cites.

- **The session map retires** once its four silent-failure notes are confirmed.

- **Walkthrough and experiment pages are out of the nav** and
  reached from their tiles; each becomes a landing once its tiles hold
  everything it shows.

### Signing in, reviewing, walking

The owner's tools, their eight tables, the two private buckets and the pull
command are built; `notes/docs/owner-tools.md` describes them. What this plan changes:

- **A review records Approve, or Request changes with feedback**, and says what
  was last sent and whether atlas has it.

- **A walk continues only on the build it started on**, so its answers always
  match the steps it pinned; `notes/docs/owner-tools.md` describes it.

### Accepted with keyboard and phone in mind

- Focus returns from a closed card to its tile, long field tables stay readable,
  back returns to where a screen was opened, and nothing depends on telling
  grey from highlighted.

## Questions

None open.

## Tasks

- [ ] rux reads the path on the site and checks what atlas links: the phases
      each tile opens, where each task sits, its homework and its quest kinds.
- [ ] Carry each phase's walked date in the data (OI-275), so a tile can say
      Verified.
- [ ] rux attests to `order-planning` and `planned-order`, and the glossary shows
      their terms.
- [ ] Simplify `run-order-planning-for-one-item` before it is walked: keep its
      essential warnings with the steps and move only optional detail out.
- [ ] Take one quest from a tile through Walk this, the pull, the intake and a
      verified correction, and time it against what the same correction costs
      today.
- [ ] Read the path on desktop and the phone, with the keyboard and back-button
      checks above, and write down what rux could not find unprompted.
- [ ] Turn walkthrough, experiment and meeting pages into landings, and retire
      the session map when its condition above is met.
