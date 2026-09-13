# The diagram

**What it is for, what it covers, and how a tile is drawn.** Every figure in
it was measured on the rendered page or derived from the synced data at
`data/guides/PIN`; nothing here is counted by hand.

**The section numbers are load-bearing and do not move.** `build.mjs`,
`specimen-kinds.mjs`, `tile-looks.mjs`, `docs/status.md` and two memos in
`rux-ln-atlas` all cite §-numbers in this file. Anything new is added at the
front without a number, or at the back with the next one.

---

## Purpose

**One map of the order-to-shipment chain: every path and branch that leads to a
shipment, and the planning that decides which one runs.** Around the main path
sit the four other things a reader needs — what must be configured first, what
the system produced on its own, what you open to find out where things stand,
and where the chain decides for you.

**Settled with rux on 2026-09-11, and it replaces a wider goal considered the
same day.** That one was an interactive visual of everything done in LN, every
screen with a tile. It was dropped on measurement, not on ambition: LN ships
thousands of sessions, atlas documents 124 of them, and a map of all of them
would be a second copy of a menu the vendor already ships with help behind it.
§11 has the scale test; the finding that ended it is that geometry was never the
problem and the axis was. **What the chain needs is depth on one route, not
breadth across a catalogue.**

**So there is one diagram, and it is the overview.** The level-2 session map is
not extended; whether it is retired is atlas's call and not this file's.

### The five tile types, and what each answers

| type | the question it answers | derived from |
| :--- | :--- | :--- |
| **Step** | what do I do here | everything else on the route |
| **Setup** | what has to be configured before any of this runs | no `flow` edge, in or out |
| **Inquiry** | what is true right now — opened, never changed | `kind` is `read` |
| **Result** | what now exists, that nobody performed | `planned`, `real`, `outcome`, `terminal`, on the route |
| **Checkpoint** | what decides on its own, and how would I know | `kind` is `gate` or `decision` |

**Two of these were renamed on 2026-09-11 and one is provisional.** `Setup` was
`Prerequisite` and `Inquiry` was `Reading`, both rux's own words for what they
are. `Checkpoint` is provisional pending `exchange/SEND-ATLAS-4.md`. The
internal classes are unchanged and still read `config` and `info`, because
renaming those rewrites five `MEASURED` rows and four files for no reader-visible
gain. **Sections 0 to 11 below were written under the old names** and are not
rewritten — a record that edits its own history is worth less than one that
maps it:

| written as | reads as |
| :--- | :--- |
| Prerequisite | **Setup** |
| Reading | **Inquiry** |

**And the SOP link is not future work.** `guide` is a node field today, it
renders in the panel, and it is present on 26 of the 43 nodes.

## Scope — what the overview holds, and what it is missing

Measured on the document 2026-09-11: 17 nodes, 5 stages, 6 lanes, 19 edges.

| | |
| :--- | ---: |
| Setup | 4 |
| Step | 4 |
| Checkpoint | 3 |
| Result | 6 |
| **Inquiry** | **0** |
| branch edges | 4 |
| nodes numbered | 0 of 17 |

**Four gaps, against the two things the map is now for:**

1. **Shipping is one tile.** The whole path to shipped is `Advise, pick and
   ship`, a single Result at stage 5. Receipt, stock and outbound share one
   column. The session map already carries `Deliver` and `Cash` stages this
   document does not.
2. **Planning has one real step.** Six nodes in Enterprise Planning, of which
   only `Generate Order Planning (Item)` and `Transfer Order Planning` are
   things you do. `Confirm Order Planning`, `Planned Orders` and `Item Order
   Plan` exist upstream and are on the session map, not here.
3. **There is no Inquiry at all.** Zero of 17. `Inventory 360` is in atlas and
   on the session map. The legend renders four entries because it lists only
   what is present; the first stock check makes it five on its own.
4. **Four branches.** `covered → ship (YES)`, `covered → gate-data (NO)`, and
   make-versus-buy off the transfer. Nothing else that can divert a route —
   shortage, partial availability, a failed allocation — is drawn.

**All four are atlas's to author.** Nodes, edges, lanes, stages and `kind` are
authored there and this side renders them, so what this repository owes is a
specification and not a build. It is `exchange/SEND-ATLAS-5.md`.

## Where it stands

**Decided and shipped:** five categories drawn by three signals (§0), one accent
(§7), a rule between the lanes (§8), a legend (§9), columns sized to their own
content (§10). Every category figure is watched by `MEASURED` and resolved by
`tools/tile-looks.mjs`. §11 says the canvas has room: 124 tiles was 1.1 screens
wide, and this document holds 17.

**Open:**

- **The overview's content** — the four gaps above, asked in `SEND-ATLAS-5.md`.
- **The vocabulary** — `Checkpoint`, and whether the domain has a word for a
  display-only session that this side should use instead of `Inquiry`, asked in
  `SEND-ATLAS-4.md` along with §6's stale enumeration.
- **Numbering.** The overview numbers 0 of 17. If it becomes the document a
  reader follows branch by branch, a numbered node is how one is cited.
- **The title.** `Order to shipment — the overview` was accurate opposite a
  level-2 map. It is atlas's to change.

**Not open, and worth saying because it was:** the canvas, its geometry, and
whether a tile can be told from its neighbour. Those are measured and green.

---

## 0. DECIDED — five categories, 2026-09-10

**Taken by rux, and it supersedes §3 below rather than being one more option
in it.** The sections after this one are kept because the reasoning is the
useful part and two of them record where this plan was wrong; what is decided
is here.

A reader at a screen with the map open asks five questions, so there are five
categories. Measured over all 43 nodes of the two diagrams:

| | | the question it answers | nodes |
|---|---|---|---|
| 1 | **Step** | what do I do here | 20 |
| 2 | **Prerequisite** | what has to be true before any of this runs | 6 |
| 3 | **Reading** | what is the state right now | 3 |
| 4 | **Result** | what do I now have | 10 |
| 5 | **Checkpoint** | what decides silently, and how would I know | 4 |

**Re-measured 2026-09-11 and one row moved: 43 nodes, Prerequisite 6.** Atlas
added two prerequisites to the session map at `23d1483`, its own answer to the
ask this side raised. Both arrive as `kind: step` carrying a session code and no
number, so Step's *numbered* count is untouched and every other row here is
unchanged. **The 6 has nothing to do with the 6 corrected below** under *All
five are derivable*, where 6 was this file's own miscount of the same category:
one is two real nodes arriving, the other was an error. Two figures reading 6
for opposite reasons is a coincidence, said out loud here so it is not read as a
reversal. From now on the counts are `diagram.*.categories` in `MEASURED`, so
the next move upstream lands in a diff rather than in this paragraph.

**Result is the one today's design has never had, and it is 10 of 43.** A
planned purchase order is drawn as a box exactly like a step, so it reads as
something to go and perform. There is nothing to perform — MRP made it. This
is also where the map's second takeaway lives: a proposal is not an order, and
both halves of that are Results.

**Checkpoint is a category and not a shade of Reading.** A Reading is something
you consult; a Checkpoint is where the run dies quietly. Three of the four
produce no message at all.

### Five categories, still one hue

They are drawn by three independent signals, not five colours:

| signal | says | values |
|---|---|---|
| **container** | on the route or beside it | solid tile · dashed card, set in from the edge |
| **name style** | act on it, or take it in | upright · italic |
| **stripe** | what you can reach | grey, an ordinary screen · none, nothing to open · **the one yellow**, it decides silently |

So Step is a solid tile with a grey stripe; Result is tinted and italic with no
stripe; Checkpoint carries the yellow wherever it stands; Prerequisite and
Reading are the same dashed card, upright and italic. Italic means the same
thing in all three places it appears — a state you take in rather than an
action you perform.

This is variant **E** in the specimen, and it is **the only one with zero
category collisions on both documents** — 4 looks to learn on the overview and
5 on the map, identical in all four themes. Today's design collides on 9 of the
overview's 17 and, less obviously, on 3 of the session map's 24.

**Shipped in `build.mjs` 2026-09-10, and one thing changed on the way in.** The
specimen set the dashed cards in `.75rem` from the column edge. Built, that
took the overview's columns from 207px to 217px — every column, because they
are all `1fr` — and a figure that fitted its container at 1272 spilled to 1324
and grew a scrollbar. §5 item 3 forbids exactly that, and the indent was the
first thing ever to test it. **Dropped**: the dashed border with no fill
already says *off the line*, and the indent was saying it a second time for
52px of horizontal scroll. Measured after: columns back to 207px, figure
1272 of 1272, grid height 1086 unchanged, all 17 tile heights identical, the
session map unmoved at 2344 and 956 with all 24 heights identical, and 0
category collisions in all four themes on both documents.

**Every column figure in this paragraph is superseded by §10 and kept as the
record of why the indent was dropped.** They were taken under
`minmax(7rem, 1fr)`, where one wide tile set the width of every column; since
2026-09-11 a column is sized to its own content and the overview reads 203 to
215px with the figure fitting at 1312. The rule the indent broke still stands,
and §10 re-states it against the new baseline.

### All five are derivable, and the claim that one was not was wrong

**Corrected 2026-09-10, same day, by rux.** This section said Prerequisite and
Reading could not be told apart, that nothing atlas sends separates
*Inventory 360* from *Production Order Parameters*, and that four categories
would ship until atlas answered an ask. All of that was wrong, and the ask has
been withdrawn.

**The error was splitting the wrong set.** It took the three `read` nodes and
tried to divide them, having classed two of them as configuration on the
strength of `D3` of the map calling them *"the two configuration sessions"*.
They are sessions *about* configuration, which you open and read — not
configuration you perform. Under the distinction that actually matters — **a
Prerequisite is set up once and is then ready; a Reading is opened to find out
what is true now** — all three are Readings. `Production Order Parameters` is
read to learn what the later tiles will do exactly as `Inventory 360` is read
to learn the on-hand.

**And the Prerequisites are the other four**, none of which is `read`: the
items, the purchase item, the bill of material and routing, the planning
cluster row. So:

| category | derived from |
|---|---|
| Checkpoint | `kind` is `gate` or `decision` |
| **Reading** | **`kind` is `read`** |
| Prerequisite | no `flow` edge, in or out |
| Result | `planned`, `real`, `outcome` or `terminal`, on the route |
| Step | everything else |

`read` has carried it the whole time. **Nothing is asked of atlas**, and the
counts move: Reading is 3, not 1, and Prerequisite is 4, not 6. *(Prerequisite
is 6 as of 2026-09-11, because atlas sent two more of them — see the note under
the table above. The 4 here was correct on the day.)*

`read` is tested **before** the path, because a Reading need not sit beside the
route — checking stock mid-sequence is still a Reading. It would then take the
solid container the path gives it and keep the italic name that says *take this
in*, which is the signals staying independent rather than an exception.

---

## 1. What is actually there

Nine kinds arrive from atlas across the two documents that carry a diagram.
Counted over all 43 nodes, re-measured 2026-09-11 — `step` was 19/19/19/14 and
took atlas's two new prerequisites, both of them coded and neither numbered;
nothing else in the table moved:

| kind | nodes | has `code` | has `route` | numbered |
|---|---|---|---|---|
| `step` | 21 | 21 | 21 | 14 |
| `real` | 4 | 4 | 4 | 2 |
| `read` | 3 | 3 | 3 | 0 |
| `gate` | 3 | 1 | 1 | 1 |
| `planned` | 3 | 1 | 1 | 1 |
| `transfer` | 3 | 3 | 3 | 2 |
| `outcome` | 3 | 0 | 0 | 0 |
| `terminal` | 2 | 1 | 1 | 1 |
| `decision` | 1 | 0 | 0 | 0 |

**Everything from here to the end of §1 describes the design of 2026-09-09 and
is kept as the record of what was wrong with it.** §0 replaced it: `build.mjs`
keys on the five categories now and styles no `ln-dg-node--<kind>` class at all,
so "six of the nine get a treatment" is a sentence about the old renderer. The
kind table above is current; these appearance figures are not, by design — §5.1
says why a reconstruction of them was thrown away rather than kept alive.

Six of the nine get a treatment in `build.mjs`; `read` gets a dashed border
and a transparent ground, the other five get a hue. `step` is the default
grey and is 19 of 41 nodes, which is the right thing for a majority case.
`decision` and `outcome` get nothing, so they render exactly as `step`.

Measured on the built pages, grouping tiles by their rendered appearance:

- **Session map: 7 kinds, 7 distinct appearances.** Nothing collides.
- **Overview: 8 kinds, 6 distinct appearances.** `step`, `decision` and
  `outcome` are all `rgb(83,83,83)` solid on the same ground — **9 of its 17
  tiles, carrying three different meanings, look identical.** This is a token
  collision, not a theme artefact: it holds in every theme because all three
  resolve to the same default.
- **Neither page carries a legend.** `stepKey()` is guide pages only. The
  panel names the kind in full, one click away, and that is the only place
  any of these nine words appears on the site.

---

## 2. Three findings, and they point away from adding colours

### 2.1 The contract already rules on the axis, and we are on the wrong one

`../rux-ln-atlas/_standards/guide-json.md` §5, normative, addressed to
renderers:

> colour says what to do with a thing, form says what kind of thing it is

`kind` is literally *what kind of thing it is*. It is currently carried by
hue for five of the nine. The one kind that is on the right axis is `read`,
which is dashed — and it is also the only one of the nine that needs no
legend, because "not one of the solid ones" is legible without being taught.

### 2.2 Three of the five hues restate what the column already says

The boundary band was built on 2026-09-10 so the transfer would read as a
place rather than a label. Measured over both documents, every `planned`,
`real` and `transfer` node without exception:

| kind | stages | relative to the band |
|---|---|---|
| `planned` | 3, 3, 3 | **always left** |
| `transfer` | 4, 4, 4 | **always on it** |
| `real` | 5, 5, 5, 5 | **always right** |

Blue-is-a-proposal and green-is-a-real-order encode, in a hue with no key,
a fact the tile's own column states outright — and stating it is the whole
reason the band exists. Red for `transfer` is the third copy of the same
fact, since the band is already red and the tile sits inside it.

**This is observed, not guaranteed.** Nothing in the contract says a
`planned` node must sit left of the boundary; it is true of 10 of 10 nodes
in the only two documents that exist. If a third document broke it, the
panel would still name the kind and nothing would be lost but the shortcut.

**Re-verified 2026-09-11: still 10 of 10** — planned 3 left, transfer 3 on,
real 4 right, against the boundary at stage 4 in both documents.

**AND IT IS SCOPED TO A ROUTE MAP, which the Purpose above is not.** This
argument works because both documents trace one run past one boundary, so a
column states a fact about an order's reality. A map of every screen has no
single run and no single boundary column, so nothing would be restating
anything and the hues would not be redundant — they would simply be absent.
Dropping them was right for these two documents; it is not a ruling about a
map that does not exist yet.

### 2.3 `kind` is two facts wearing one name, and the useful one is not it

`code` and `route` are present or absent together on all 43 nodes — no node
has one without the other. **Re-verified 2026-09-11: 34 carry both, 9 carry
neither, 0 carry one without the other.** The figure was 41 when written. They split the vocabulary in a way `kind` does
not:

| | nodes | kinds present |
|---|---|---|
| **session map** | 26 of 26 openable | every kind it uses |
| **overview** | 8 of 17 openable | `step`, `real`, `transfer` |
| **overview** | 9 of 17 **not a session** | `decision`, `outcome`, `gate`, `planned`, `terminal` |

The same kind is a session on one page and not on the other. `gate` is
`cprrp0520m000` on the session map — a screen you open — and a bare question
with no code on the overview. So is `planned`, so is `terminal`.

**That is why `decision` and `outcome` have no treatment.** They are not a
gap in a colour scheme. They appear only on the overview and only as
non-sessions, and the renderer has never had a form for *the thing that is
not a session at all* — a whole second category it has been drawing as a
session this entire time.

And "can I open this?" is the question a reader with the map beside a screen
is actually asking. It is 100% present in the data, it needs no new field
from atlas, and it is not what `kind` answers.

---

## 3. The plan

**Encode openability as form. Reduce colour to one thing. Leave the nine
names to the panel, which already carries them.**

### 3.0 Two axes, not one — and the second one is the reader's first question

**Added 2026-09-10, from rux, and it corrects the section below rather than
extending it.** The version of §3.1 that follows was written around one axis,
*can I open this*, and it put the master-data prerequisites in the same faint
bucket as a mid-flow state like *planned production order*. That is wrong in
the direction that matters: the planning cluster row is the difference between
an item planning can see and one it silently cannot, and drawing it as
background draws the wrong conclusion about it.

The axis that comes first is **on the path, or beside it**. Following the
sales-to-order route is what the map is for, and a prerequisite is not on that
route — it has to be true before the route runs, and you go and make it true
somewhere else.

**It is already in the data and needs no new field.** A node with no `flow`
edge, in or out, is one the sequence never enters or leaves. Measured over
both documents it lands on exactly the right nodes:

| | beside the path | what they are |
|---|---|---|
| overview | 4 of 17 | the whole `Master Data` lane |
| session map | 5 of 26 | the parameter and inventory checks, and since `23d1483` two prerequisites in a `Master Data` lane |

*(The map read 3 of 24 when this was written. Re-measured 2026-09-11.)*

**And it cuts across `kind`, which is why `kind` could never have shown it.**
`Items and groups` is a `step` and sits beside the path; `Bill of material and
routing` is an `outcome` and sits beside it; `Finished item into stock` is also
an `outcome` and sits **on** it. Same category, opposite roles.

So the canvas carries two independent axes and one hue:

| | | |
|---|---|---|
| **beside the path** | a dashed card, inset, full weight | setup and checks |
| **on the path** | a solid tile | the route, read left to right |
| *within either* | a code line and a stripe | a screen you open |
| *within either* | no stripe, tinted, italic | a state or a question |
| *over both* | the one hue | a checkpoint that fails silently |

This is variant **D** in the specimen, and it is the only one that takes
`colliding by path` to 0 on the overview — 9 today.

### 3.1 Three forms on the canvas

| form | means | data test | map | overview |
|---|---|---|---|---|
| solid tile, code shown | a session you open and change | `code` present, kind is not `read` | 21 | 8 |
| dashed tile, no number | a session you open and only read | kind is `read` | 3 | 0 |
| **new** — no stripe, tinted ground, name in italic | not a session: a state, a question or a result the chain passes through | `code` absent | 0 | 9 |

The third is the new work. It is deliberately *not* a fourth border colour:
the point is that it should not read as a box you can go and open. The exact
treatment is to be drawn and measured, not specified here — the constraint is
that it must be told apart from the other two at a glance, in all four
themes, without a legend, and without widening a column (measured today: one
wide tile face widens all of them, 221px to 283px).

### 3.2 One accent colour, not five

Keep a hue for **`gate` and `decision` only** — the points where the chain
decides silently. §2 of the session map says the third thing a reader must
take from it is *"the chain fails silently in four places"*, and unlike the
proposal/order distinction there is no geometry that shows it. Four nodes of
41, so it stays a mark on an exception.

**Form and hue are independent axes, and the specimen is what proved it.** The
first draft of this section took the stripe away from every non-session,
which quietly took the accent with it — and on the overview **every `gate` is
codeless**, so the one hue the plan kept was invisible on the page whose
content is mostly gates. The takeaway being hidden was the one this section
exists to protect. A checkpoint that is not a session is *both*: it takes the
tinted ground and the italic name from its form, and keeps its stripe.

Drop the hue from `planned`, `real` and `transfer` per §2.2. `terminal`'s
near-white is worth keeping or dropping on its own merits; it is one node per
document and the argument is weaker either way.

That takes the canvas from five unkeyed hues to one, which is the same move
f2e6349 made for tokens — seven hues with no legend became four registers
carried by shape and font family, 2761 pills to 265.

### 3.3 The panel is unchanged

It already names all nine kinds in `.ln-dg-kind` and pairs the name with the
accent. Nothing proposed here removes a distinction; it moves eight of the
nine from an unkeyed hue on the canvas to a word in the panel, which is where
the only copy of that word has always been.

---

## 4. What this does not propose

- ~~**A legend for the diagram.**~~ **REVERSED 2026-09-11 by rux, and §9 is
  the record.** The argument below still holds for the *forms* — they measure
  out at four looks and five with nothing colliding, and the legend does not
  exist to tell them apart. It exists because §1's other finding was never
  answered: these five words appear nowhere on the page except inside a tile's
  own panel. The forms carry the distinctions; the legend supplies the nouns.
  If three forms need one, they are the wrong
  three. That was the finding behind the four registers — *"a key for them
  would have been an apology"* — and it applies here unchanged.
- **A new field from atlas.** `code` is already there and already exact.
  Asking for an `openable` boolean would duplicate it.
- **Deriving meaning from a kind atlas has not sent.** A kind with no
  treatment must still render as a readable tile. That is the contract's own
  guarantee at §6 — *"a consumer that has not styled the kind still renders
  the words"* — and it is what makes the default safe rather than lossy.
- **Touching the session map's appearance more than the plan requires.** All
  24 of its tiles are sessions, so §3.1's new form draws nothing there. What
  it would lose is three hues, and what it gains is a canvas whose remaining
  colour means one thing.

---

## 5. What would settle it

Not an argument — these, measured before and after, both documents, all four
themes:

1. ~~**Tiles whose appearance collides with a tile of a different kind.**~~
   **Wrong as written, corrected 2026-09-10 by running it.** It scored B at 17
   of 17 colliding, worse than today's 9 — nonsense, because B deliberately
   merges nine kinds into three forms, so measuring by kind assumes the very
   thing A and C assert and B denies. A figure that can only rank one option
   is the conclusion wearing a number. It is two figures:

   - **Colliding by register** — tiles that cannot be told from one in another
     of the three groups §3.1 defines. Scored the same way for every variant,
     so it ranks all three. Today: **9 on the overview, 0 on the map.** Both
     C and B take it to 0.
   - **Colliding by kind** — the stricter test, that all nine be
     distinguishable at rest. It is the question being decided, so it is
     reported and not used to rank: today 9 on the overview, 0 on the map.
2. **Looks a reader must learn, with no legend.** Measured on the specimen,
   identical in all four themes: **A is 6 on the overview and 7 on the map;
   C is 4 and 7; D is 4 and 3; B is 3 and 3.**

3. **Colliding by path** — tiles that do not say whether they are on the route
   or beside it. **A is 9 on the overview**, C and B are 14, **D is 0.** The
   map is 0 in every variant, because it has no prerequisites on it at all —
   which is the subject of the ask now held in atlas as
   `exchange/send-atlas-3.md`, not a clean bill of health.

   **That ask was answered and the last sentence is no longer true.** Atlas
   replied at `23d1483` and added two prerequisites to the map in a `Master
   Data` lane, synced here at `2ab6911`: the map has 5 of 26 tiles beside the
   path now, and its 0 is a real 0 under the shipped design rather than an
   empty set. Corrected 2026-09-11 by re-measuring, not by re-reading.

**And one figure here was overstated, corrected the same day.** §1 said 9 of
the overview's tiles are indistinguishable, on a signature of border,
background and font style. A session also renders its code under the name and
a non-session renders nothing, and counting that line the figure is **0, in
every variant including today's.** The code line is a real cue. Whether a
second line of small grey text reads as a *category* is the thing in dispute —
it is information, not a form, and a box shaped like a box you open, in a grid
of boxes you open, reads as one. The specimen reports it both ways so neither
version of the argument gets to pick its own number.
3. **Column width and figure scroll width.** Today 207px and 1272 on the
   overview, 260px and 2344 on the map. Neither may grow; the tinted ground
   in §3.1 is the risk.

   **Re-baselined 2026-09-11 by §10.** Columns are sized to their own content
   now, so there is no single column figure: the overview runs 152 to 203px and
   fits at 1312 of 1312, the map runs 110 to 260px and scrolls 1746. The rule
   is unchanged and is still what stopped the indent — neither figure may grow
   for a change that is not about width.
4. **Contrast of every accent against its ground, in all four themes**, the
   way the named register was measured at 13.76 to 18.1 in f2e6349.

### 5.1 The specimen, and what it became

**Repointed 2026-09-11, once E shipped.** It lifts its CSS out of the built
pages, so the day the categories landed, variant A — "today" — became variant
E. Measured on the first run after: A and E scored identically at 0 colliding
and 4 looks, while B, C and D scored *worse* than they had, because they were
no longer alternatives to the old design but partial overrides on top of the
new one. **It had quietly stopped meaning anything while still printing
numbers** — the failure it exists to catch in other things.

A `before` variant was written to keep the comparison alive by undoing the
shipped rules, and **thrown away**: overriding the new CSS merges categories
the old design kept apart, and it scored the overview at 4 looks and 14
colliding where the real 2026-09-09 measurement was 6 and 9. A reconstruction
that misreports what it reconstructs is worse than none. The before-and-after
figures below were taken while both designs existed, which is the only time
they could be taken honestly.

**What it is now is a regression view**: one variant, no overrides, and a new
headline figure — **one category, one look**. That is the figure that was
missing. Every collision count read 0 while Prerequisite was being drawn two
ways, and read it correctly: a three-sided box is still nothing like a Step.
Collisions ask whether two categories can be told apart; nothing asked whether
*one* was drawn consistently until a person looked at the page.

### 5.2 What it was

`tools/specimen-kinds.mjs` writes `build/specimen-kinds.html` — the two real
figures, three times each, differing by CSS alone, with the figures above
computed live in whichever of the four themes is on. It lifts the markup and
the whole stylesheet out of the built pages, so **variant A is the live site
byte for byte** and no mock-up is being judged. `build/` is git-ignored and
skipped by `check-publishable`, so this is a decision aid and never a page.

It has already earned itself twice: it caught the hidden accent in §3.2 and
the bad metric in §5.1 above, both within a minute of first running, and
neither was visible from reading the plan.

**The third variant, C, is the conservative option and is not a straw man.**
It adds the missing form and changes no hue, so it fixes finding 2.1's
collision and declines 2.2 and 2.3. On the session map it is *identical to
today* — 7 looks, 0 collisions — which is the honest case for it: the map is
all sessions, so the only page C leaves untouched is the one this whole plan
was written about.

`MEASURED` gained 26 diagram rows today and `diagrams.kinds` is one of them,
so a tenth kind arriving from atlas will show up in a diff rather than in a
grey tile nobody notices. Figures 1 and 2 are now measured in the specimen but
**not in `measure.mjs`**, and they belong there whether or not this plan is
taken: `colliding by register` is a defect count that nothing watches, and it
is 9 today.

**They are there now — `tools/tile-looks.mjs`, 2026-09-11 — and what went in is
not quite what was asked for.** `colliding by register` and `colliding by kind`
were both written before §0 decided five categories: by-kind was the question
being decided and it is decided, and by-register was the three groups the
categories replaced. So what is measured is **by category**, the same test over
the vocabulary that won, plus `looks-per-category`, plus the resolved look of
each category as a row of its own. Twelve rows per run across the two documents.

**It resolves the CSS instead of asking a browser, which buys a diff and costs a
theme.** It reads the diagram's rules out of the page it is given, works out
which land on which tile — specificity included, which the shipped stylesheet
turns on — and resolves the same five properties the specimen's `sig()` reads.
So it compares *token names*: if two tokens paint the same value in one theme,
two tiles collide on screen and not in the figure. **That half stays the
specimen's**, and it is why the specimen is not retired. It also refuses rather
than guesses: an attribute selector, a sibling combinator, an `:nth-child`, a
rule keyed above the tile, or a `:has()` of anything but a bare class all throw.
Tested by injecting each one.

**It was checked against three things it did not author before being trusted:**
the browser's own computed values on both documents, and both figures
`63094e5`'s commit message quotes from the day of the defect — 5 looks with
Prerequisite at 2 before, 4 with Prerequisite at 1 after. It reproduces all
three. Then it found §7.

---

## 6. ~~Owed to atlas, and not blocking~~ — WRONG, and it was wrong when sent

~~`guide-json.md` §7 enumerates the kinds as *"`step`, `gate`, `planned`,
`transfer`, `real`, `terminal`, `read`"* — seven.~~ **It enumerates nine, and
has since `cc7bff2` on 2026-09-11 at 00:19 — which is contained in
`ab9d6ca`, the pin this repository's own data carries.** Verified here by
reading `_standards/guide-json.md` at that pin rather than by taking atlas's
word for it: `step`, `gate`, `planned`, `transfer`, `real`, `terminal`,
`read`, `decision`, `outcome`.

**The finding was real and is fixed; this section is what was left behind.**
The enumeration genuinely was two short, four tiles of the overview genuinely
drew as ordinary steps because of it, and it was found by measuring a built
page rather than by reading the contract. Atlas fixed it the same night and
also replaced a duplicate of the same list in the session map's §5, so there is
one list again instead of two that can disagree.

**What is worth recording is how the correction failed.** This section was
carried into `exchange/SEND-ATLAS-4.md` §4 as a live defect and atlas spent a
section of its reply answering it — while the corrected sentence had already
been read in this session, from this very file, to check the `budget` contract.
The evidence was open and the claim was restated from memory of a document
rather than from the document. A stale line in a design note became a wrong
statement to another repository, which is the cost of this file being both a
record and a source for memos.

---

## 7. The one hue went missing a second time, and the figure that found it

**Found 2026-09-11 by the tool in §5.2, on its first run, and confirmed in the
browser before it was believed.** Every Checkpoint on the overview — all three,
and the overview is the document whose content is mostly gates — was drawn with
`border-inline-start: 0px none`. No yellow. The one colour the design kept was
invisible on the page §3.2 was written about, for a day.

**It is the same defect as §3.2 and a different mechanism, which is why nothing
caught it.** §3.2's version was a rule that took the stripe from every
non-session; this one is specificity. `63094e5` fixed the three-sided
Prerequisite card by excluding the two categories drawn beside the route:

    .ln-dg-node:not(:has(.ln-dg-node-code)):not(.ln-dg-cat--config):not(.ln-dg-cat--info)

Those two `:not()`s took that rule from (0,2,0) to (0,4,0), past
`.ln-dg-cat--check:not(:has(.ln-dg-node-code))` at (0,2,0) — the rule whose only
job was to give a codeless Checkpoint its accent back. Before the fix the two
were equal and the later one won. **One commit closed the card and opened this,
and its own message is careful about everything it measured.** What it measured
could not see this: a stripeless italic tile on `layer-01` still collides with
nothing, so `looks`, `looks-per-category` and `colliding-by-category` all read
their good values throughout. Three green figures and a missing colour.

**The fix is to name the one category the rule is about**, rather than to add a
third `:not()` and leave the trap armed:

    .ln-dg-cat--step:not(:has(.ln-dg-node-code))

Step is the only category whose stripe is the plain grey default; the other four
have each said what their inline start is, so the not-a-session refinement has
nothing left to refine in them. The `.ln-dg-cat--check:not(:has(…))` rule is
deleted, not reordered — it existed only to undo the over-reach. **What this
gives up:** a sixth category added later with no inline-start rule of its own
keeps the grey stripe when it has no code, where the old rule would have removed
it. That is a local decision arriving with its own CSS, not something atlas can
send: a new `kind` lands in one of the five categories.

**Measured after, both documents, all eight themes:** one look per category, 4
looks on the overview and 5 on the map, 0 colliding, the Prerequisite card
dashed on all four sides, and the accent back at `3px solid
var(--rux-support-warning…)` — 241,194,27 in the four Carbon themes and the
four brand yellows elsewhere. And measured before and after at a fixed 1440
viewport, to show the geometry did not move: column 215px either way, figure
1312 of 1312 either way, all 17 tile heights identical. The stripe costs 3px of
border where the missing stripe cost 3px of padding.

**The instrument is the point of this section.** An accent that disappears is
not a collision and not an inconsistency, so no figure that counts either could
ever have reported it. What reports it is the look itself being a row —
`diagram-looks.check` — so the colour has to survive a diff rather than a
person's memory of what the page used to look like.

---

## 8. The lanes get a rule, and what that did not fix

**Asked, drawn, measured and shipped 2026-09-11.** Six lanes run down both
diagrams and nothing separated them. The case for a line is one figure, taken on
the rendered pages at 1440:

| | |
| :--- | :--- |
| two tiles stacked **inside** one lane | 8px apart, every pair, both documents |
| two tiles in **different lanes**, same column | **8px apart** — overview column 6 twice, session map columns 7 and 8 |
| the same lane boundary elsewhere | **543px** — map columns 3 and 9, where the lanes between are empty |

So 8px meant both things at once, and where it did not, the same boundary was
543px of nothing. A reader had no way to tell the rest of a lane from the start
of the next one, and no amount of looking at the gap would have told them.

**What shipped is a rule at the top of every lane, spanning every column, and
the stage headings gave up their own underline to it.** That underline was drawn
per stage, so it broke at every column gap; the first lane's rule sits in the
same place, runs unbroken, and does the same job. Two lines 10px apart became
one.

**A tile used to sit flush on that line**, because `align-items: start` puts a
tile at its row's top and the rule is at the row's top. The cells took `.5rem`
and the lane labels took the same, so every tile now clears the rule by 8px and
the label text still lines up with the first tile's title exactly as before —
measured on the text rather than the boxes, because a box top does not move when
you add padding to it: **−14.1px before and −14.1px after, all six lanes.**
Column 215px and figure 1312 of 1312 either way; the grid is 47px taller, which
is the padding and nothing else.

### It is an element, and the pseudo-element that failed is the reason

The rule could have been an `::after` on the lane label with no new markup, and
in the specimen it was. **It works only while the label is unpositioned.** The
third variant made the lane name sticky so it survives scrolling, and
`position: sticky` makes the label a containing block — the rule stopped
resolving against the grid and collapsed from 1280px to the width of the label.
Nothing about the rule was wrong; the label underneath it had changed what "the
full width" meant. A grid item spanning `1 / -1` cannot do that, so that is what
ships.

### The lane name still leaves, and that is declined rather than unnoticed

The second variant was the other half: `.ln-dg-lane` sits in column 1 of a grid
that scrolls, so on the session map — 2612px of figure in 1312px of frame —
scrolling to the far right puts the label 1053px off the left edge. **0 of 6
lane names are readable for the right-hand half of that document.** Sticky fixed
it, measured at 6 of 6, and it is **not taken**: a rule holds your row while your
eye travels, which was the question asked, and an opaque label painting over
tiles as they pass under it is a second thing to judge. Recorded in
`docs/status.md` under *Known losses* so it is a decision rather than an
oversight.

**The specimen's own figures are the regression view now**: `ruled` reads 6 of 6
and `name held at far right` reads 0 of 6 on the shipped page, every run. The
first is what was fixed; the second is what was not.


---

## 9. The legend, which §4 said not to build

**Asked for directly on 2026-09-11, after the lane rules went in, and the
request was for a legend *instead of* the wall of text at the foot of the
figure.** Both halves shipped.

**Why it is not simply a climbdown.** §4 declined a key on the grounds that
forms needing one are the wrong forms, and that still stands: the five
categories measure 4 looks on the overview and 5 on the map with 0 colliding,
and nobody has to be taught a dashed card to see it is not a solid tile. What
§4 never answered is the finding sitting two sections above it in §1 — *"the
panel names the kind in full, one click away, and that is the only place any of
these nine words appears on the site."* A reader who never opens a tile has
four unlabelled looks and one unexplained colour. **A form can carry a
distinction without carrying a name**, and the legend supplies only the names.

**Every swatch is a real tile.** It carries `ln-dg-node` and the same
`ln-dg-cat--*` class the canvas uses, so its border, ground, stripe and italic
all come from the rules that draw the figure. Verified in the browser rather
than asserted: the computed stripe, ground, name style and name colour of every
swatch are **identical to the tiles of its category — 4 of 4 on the overview, 5
of 5 on the map**. A hand-drawn key that says *dashed* on the day the tiles go
solid is the failure a legend invites, and this one cannot do it.

**It lists only what the document contains.** The overview has no Reading, so
its legend has four entries. A key that teaches a look the reader will not meet
is the beginning of the wall of text it replaced.

**One exemption, and it is named.** A swatch carries no session code, so the
not-a-session rule would draw the Step swatch stripeless — the single thing that
swatch exists to show. The exemption is a `:not(.ln-dg-key-tile)` *on that
rule*, not an override placed after it, because an override at equal specificity
is exactly the trap §7 records. The rule is (0,3,0) and nothing competes.

**The wall of text folded rather than went.** The off-sequence edges — 9 on the
overview, 5 on the map — are the only statement anywhere on the site of which
edges run against the reading order, and their addresses exist in no other
place. The reading-order sentence stays visible; the list moves into a
`<details>` whose summary carries the count. Same bargain the tiles strike.

**And it broke the specimen, which is the useful part.** `score()` selected
`.ln-dg-node` and a swatch is now one of those — with no kind class, so the
readout died on `undefined`. That is the right failure: the class means "a tile
or a specimen of one" now, and the fix is to scope the census to
`.ln-dg-grid .ln-dg-node` rather than to loosen what a tile is. `tile-looks.mjs`
was never affected — it looks for `<details class="ln-dg-node`, and a swatch is
a `<span>` — and `js/diagram.js` skips any node with no detail panel, which a
swatch has not. Both were checked rather than assumed. Every
`diagram-looks.*` row in `MEASURED` is byte-identical before and after the
legend.

---

## 10. Each column as wide as its own content

**Asked for as "reduce the tile width further" on 2026-09-11, drawn three ways
in the specimen, and `max-content` chosen.** The figure was
`minmax(7rem, 1fr)`: every column the same width and every one of them
stretching to fill. That made the widest tile anywhere the width of every tile
everywhere — measured on the session map, **ten tracks of 275px, because one
tile needed 275.**

| session map | column | scrolls |
| :--- | :--- | :--- |
| `minmax(7rem, 1fr)` | 275px, all of them | 2612px in a 1312px frame |
| **`max-content`** | 110 · 195 · 115 · 200 · 156 · 122 · 243 · **260** | **1738px** |
| 12rem cap | 192px, all | 2004px |
| 10rem cap | 160px, all | 1716px, and 94px taller |

**It costs nothing, and that was checked rather than assumed.** `max-content`
never takes a column below what it holds, so no name wraps and no tile grows.
Measured by flipping the live page between the two rules: **grid height 1230px
and tallest tile 138px under both, 0 wrapped names under both** — the only
figure that moved was the scroll. The column that needed 260 still has 260; the
saving is entirely the other seven falling to what they actually hold. Tiles
within a column are still all one width, because a cell stretches them to the
track. What changed is the scope of *widest*, from the grid to the column.

**What is given up is the even lattice.** The figure reads as a compact table
with columns of different widths rather than a regular grid, and the two capped
variants are what that would have cost: they keep the lattice and pay for it in
wrapped names and height. **And the empty stage column goes with it** — the
map's undrawn Cash column falls from 275px to 65px, the width of its own
heading. It is still drawn and still labelled, which is what §8 of that map
argues for, but it no longer holds a column of space to make the point. That
consequence was put before rux with the choice.

**One thing was added that nobody asked for, and it is reversible in a line.**
With the columns sized to content the tracks stop short of the figure — the
overview's come to 1114px inside a 1280px grid — and a lane rule spanning
`1 / -1` stopped 166px from the right edge with the figure's ground showing
past it. A trailing `1fr` track takes the slack, so the rules reach the edge as
they did when every column stretched. It holds nothing and computes to zero on
a figure that overflows; on the map it costs one 8px grid gap, 1738px to 1746px.
Delete the ` 1fr` from `.ln-dg-grid` to have the rules end with the content
instead.

---

## 11. What 124 tiles does to the canvas

**Run 2026-09-11, because the Purpose changes the unit from the route to the
screen and nobody had measured what that costs.** 124 synthetic nodes — the
real session names and modules from the atlas checkout at the pin, generic
descriptions so no private prose reached a generated page — put through
`build.mjs` itself and measured in the browser at 1440. Three shapes, differing
only in how many stages the run is divided into:

| shape | stages | scroll width | screens wide | grid height | tallest cell |
| :--- | ---: | ---: | ---: | ---: | ---: |
| A | 5 | 1466px | **1.1** | 2018px | 10 tiles |
| B | 9 | 2373px | 1.8 | 1241px | 6 tiles |
| C | 14 | 3426px | 2.6 | 978px | 4 tiles |
| *the map today* | *9* | *1746px* | *1.3* | *1230px* | *5 tiles (26 nodes)* |

**The prediction going in was that the canvas would not hold it, and that was
wrong.** At five stages 124 tiles is 1.1 screens wide and 2.2 screens tall —
an ordinary long page. Stages trade height for width and nothing else: the
grid does not break, the lane rules hold, the legend renders, and no tile
overflows. **Geometry is not the obstacle and should stop being cited as one.**

**What breaks is the axis.** `Common` holds 47 of the 124 sessions, and a lane
× stage grid asks each of them which point in a run it belongs to. Master data
has no answer: a screen for item defaults is not early or late, it is
underneath. So they pile into whichever cell the stage assignment invents — ten
tiles stacked in one cell, in an order carrying no meaning, under a heading
that says `PREPARE`. Seen on the rendered page, not inferred: the figure stops
being a diagram and becomes a list in columns with a process heading over it.

**Three things follow, and none of them is a rendering change:**

- **A stage is only honest inside a run.** For the ~47 reference-data screens
  the coordinate the contract asks atlas for does not exist. Either they are
  not on this map, or the map needs an axis that is not "when".
- **A cell is a set, not a sequence.** The renderer stacks a cell's tiles in
  emission order and nothing says what that order means. At 2 tiles nobody
  asks; at 10 it is the first question.
- **Nothing helps a reader find one tile in 124.** No search, no filter, no
  zoom, no "show me only the Prerequisites". At 26 tiles that was a
  non-question.

**What was not measured:** whether a reader can use any of these shapes. The
figures above are geometry, and the 124 placements were invented by the test
rather than authored — so the test says the canvas survives, and says nothing
about whether the map would be worth reading. That is the next thing to find
out, and it needs real placements, which is a question for atlas.
