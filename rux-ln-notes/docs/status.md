# Status — where this project stands

What is outstanding, and — because this project has been wrong about its own
state four times — **which lines a generator watches and which are prose that
can rot.**

Run `node tools/measure.mjs` before trusting anything in the first section.
Nothing else here is checked by anything.

---

## Now — atlas answered both memos; the depth is its to draw

**The diagram is one document: `order-to-shipment-overview`.** Every path and
branch that leads to a shipment, and the planning that decides which one runs,
with the configuration, results and status checks around it. Settled with rux
2026-09-11 and written into `docs/diagram.md`.

**A wider goal — a map of every screen in LN — was considered and dropped the
same day, on measurement.** LN ships thousands of sessions, atlas documents 124,
and drawing them reproduces a menu the vendor already ships. **The canvas was
never the constraint**: 124 synthetic tiles went through the renderer and held,
1.1 screens wide at five stages. The axis failed instead — `Common` holds 47 of
the 124 and master data has no honest answer to *which point in the run*. §11
of the design document has it.

### The names are final, and atlas's evidence is why

**Step · Setup · Inquiry · Result · Checkpoint**, shipped and live.

- **`Inquiry` is kept, and it is not a coinage.** `send-atlas-4-reply` found it
  in the deployed menu print — 47 lines under `Inquiry`/`Inquiries` folders
  across seven places, holding exactly this category. **Two catches stand**: the
  word is Financials and Project only, **zero in any lane either diagram draws**,
  and the vendor guides use it once meaning a customer's *pre-sales inquiry*, a
  sales document, in the module the diagrams are busiest in.
- **`Overview` must not be used for it.** The vendor's *overview session* versus
  *details session* is a list-versus-record pair, not read-versus-maintain:
  **Items** is an overview session and is where items are maintained.
- **`Checkpoint` stands as a recorded choice.** `checkpoint`, `control point`
  and `decision point` all score 0 across the help and the vendor guides; the
  domain says it as a verb — *"LN checks"* 79 times — and never as a noun.
- **`automatic activity` is reserved, not spent.** It is a real Infor term for
  *a step LN performs without you*, which is not a Checkpoint — a Checkpoint
  evaluates and may stop, it does not act. It is the name if a sixth category is
  ever wanted.
- **One seam to watch, flagged by atlas and asking for no change.** `gate` and
  `decision` fold into one badge, and on this document `covered` is the decision
  while `gate-data` and `gate-horizon` are the machinery behind it. Three
  identical badges in a row, where the first is the answer and the others are
  the workings.

### Four of five asks taken, one refused, and nothing to build here

`send-atlas-5-reply`, and none of it needs work on this side:

- **Shipping.** Taken. `Execute` splits and `Deliver` becomes its own stage, as
  the session map already has it. Two or three tiles, not four — the overview's
  job is the shape.
- **Planning.** Taken, and **one node is blocked**: `Confirm Order Planning`
  (`cprrp1200m000`) has a verified route but no session file and no help
  exported, so the session governing the `Confirmed`-status rule — the chain's
  commonest silent failure — cannot be drawn at tile grain yet. **OI-019.** The
  order is export, write the file, then draw.
- **Inquiry.** Taken; `Inventory 360` and `Item Order Plan` are both ready. **An
  open question comes back to us**: the session map holds reads as *strips on
  the tile they prove* rather than tiles of their own. At the overview's
  altitude that may flip, and the legend renders from what is present, so the
  choice changes the counts. Atlas will say which it chose.
- **Branches — refused, on evidence.** All three named are open issues: the
  2026-08-04 shortage run stopped at advised 5 of 20 and never reached a
  shipment (**OI-085**), back-order behaviour on a short shipment is
  unconfirmed (**OI-077**), and which rows a pick confirms is not in the help
  (**OI-036**). Drawing them would answer an open question with a picture, and
  an arrow is the least markable form a claim can take. **What unblocks it is a
  capture, not a decision.**
- **Numbering and the title.** Both taken. `Order to shipment — the map` is the
  agreed rename and lands in the same commit as the depth, not before — a title
  promising branches before any are drawn is a label outrunning its contents.

### The session map is not retired

Atlas declined that explicitly. It keeps §7.1 — the four ways this chain fails
with no message — which has no home on the overview at any depth, and
`START-HERE.md` points a first-time reader at it. **Kept, published, and frozen
as a diagram**: its `diagram` block stops growing and the depth lands on the
overview. It still emits, so nothing here should be built assuming it goes away.

**The item that used to be here was published, not re-read.** The item was to sync atlas's two prerequisite tiles and look at
them. Done at `2ab6911`, atlas `ab9d6ca`, Pages green, and verified on
`rux-sm.github.io` rather than in the local build: HTTP 200, 2 `Prerequisite`
pills, revision stamp `ab9d6ca`, and the corrected edges reading
`Item → 2` and `Item - Purchase → 7`. `Item → 2` is the point — atlas's
correction was that the cluster prerequisite feeds where the horizon is set,
not tile 3 where the absence finally shows.

**The eye the item asked for was used, in all eight themes, and found nothing
to fix.** The measurement is under *Known losses* below, because what it found
is about rux-ds's four brand themes generally and not about these tiles.

**True of the tiles it was looking at, and wrong as a clearance — corrected the
same day.** The eye was on the session map's two new prerequisites and did not
go to the overview, where all three Checkpoints were drawn with no stripe at all.
Eight themes of looking at the right tiles did not find it; resolving the
stylesheet found it in one run. *Decided, not built* below has the record.

**Still open elsewhere, since 2026-09-12 done in the same session rather than
waited on:** the vocabulary question in rux-ds, and `SEND-ATLAS-2.md` §1,
which blocks atlas's screen-reference emitter. The one list across the family
is the hub's `docs/status.md`; the items below are the record of why.


- **Whether `--rux-border-strong-01` is meant to keep 3:1 in every theme
  rux-ds ships, or only in the four it compiles.** Sent 2026-09-11 as
  `SEND-DS-2.md`, with every figure taken on rux-ds's own `kitchen-sink.html`
  so it reproduces from their checkout with this one closed. Five of the twelve
  brand theme-and-rung combinations sit below 3:1, all but one of them `-01`.
  **Nothing here is blocked on the answer** — the measurement is recorded under
  *Known losses* and no local override was written, because this project's
  `rux-theme.css` holds no token values by policy.

- ~~**Whether the session map draws what has to be set up first.**~~
  **ANSWERED 2026-09-11, and the answer is drawn upstream** —
  `exchange/send-atlas-3-reply.md`, atlas `23d1483`. It overturns its own §8
  exclusion by exactly two nodes: **two prerequisites in a Master Data lane**,
  the count of numbered steps unchanged. It also **corrects this side's §1
  table**, which drew the first two failures as independent with independent
  prerequisites — adding the cluster row is what creates the wrong horizon, so
  they are one prerequisite and its immediate aftermath. That changes an edge
  label, not the conclusion. **The rendering side asks for no contract change**:
  a Prerequisite is derived from the edge list, drawn beside the path,
  unnumbered, and shipped since `63094e5`. **Nothing here has been synced or
  looked at yet** — that is the pin bullet above, and it is not evidence the
  tiles render until a person has seen them.

- **Whether an inline-reference vocabulary belongs in rux-ds.** Sent to the
  *Guide template review* session on 2026-09-10 with the measurements. **It has
  an answer ready — a written guide rather than new classes — and is waiting
  for rux's word before sending it back.** Until then the four registers live
  in `build.mjs` as local CSS, which works and is shipped.
- **The `::after` separator, now rux-ds's own finding.** They reproduced it on
  Carbon's own site with Carbon's markup and confirmed it is live in their
  document template: at 500px every route stacks one segment per line and each
  line ends with a hanging slash. Not ours to fix and no longer our problem —
  we render routes as text — but it is why R2 was worth raising even though it
  was withdrawn.
- **How far atlas sits past the pin is not written here any more, and this
  line is where it kept going wrong.** It has now been wrong five times. The
  last two were hours apart on 2026-09-11: it read "1 commit, 0 documents", was
  corrected to "5 commits, 2 documents changed", and was stale again within the
  hour because the sync it asked for was done — the pin is atlas `ab9d6ca` and
  the distance is 0. The *Watched* section below already says this is live
  state, printed by `node tools/check.mjs` and by the sync scripts and
  deliberately never copied into this file. Writing it here anyway is what the
  rule was written to stop, so the number is gone rather than corrected a
  sixth time.

**Done on 2026-09-10, recorded so none of it is listed a fourth time:**

- **The four answers owed to atlas are sent** — `SEND-ATLAS-2.md`, `25679e3`.
  Its own instrument was the fault in one of them: `measure.mjs` named a
  figure for step tables and walked the whole document.
- **A guide page has somewhere to write** — `e3f7e86`, `js/guide.js`, 99
  fields across the seven guides, one per row atlas marks `produces`, live.

- **The document template is DECIDED: not adopted.** This project's shell is
  its own and `templates/document-page.html` is a reference. The reasoning and
  its measurements are in `AGENTS.md` — briefly: adopting would re-import the
  seven tag colours and the breadcrumb this repository removed on evidence the
  same week; the pin the adoption was designed around no longer exists; and the
  one thing the template had that these pages lacked, a capped reading measure,
  was taken on its merits. **This item also said "per `AGENTS.md`" and that was
  wrong** — `AGENTS.md` never carried the adoption promise, `docs/status.md` did. It
  does now, as a decision rather than a plan.

- **The seven tag colours are four registers**, shipped and live: 2761 pills
  to 265 site-wide, 166 to 22 on a guide page. Press, named, exact, state.
- **`openIssues` renders** — 16 badges across 9 documents and 7 index cards.
- **The route was built as a breadcrumb and reverted the same day.** The ruling
  was right about clipping and wrong about the rest; three findings are in the
  note above `ROUTED` in `build.mjs`.
- **The reading measure, the step-table column rule, and the step key.**
- **`template-candidate.html`'s four defects.**
- **The switcher** — built and live before any of this; listed as outstanding
  twice today, both times wrongly.

**`SEND-DS.md` and `SEND-ATLAS.md` are both fully answered and can retire.**
This used to read "once item 3 is decided and item 1 is sent"; both happened on
2026-09-10 — the template was declined in `5f5fa96` and recorded in `ad82173`,
and the setup ask went in `91cfd6c`. `template-candidate.html` stays: it
is the only page here with invented content, which makes it the one artifact
that could cross to rux-ds, and `build.mjs` re-inlines the sprite into it by
name.

## Watched — `MEASURED` answers these; read them there

`publishable.pages-flagged` (0 is the condition for staying public) and the
two `*.pin` rows. How far each sibling's checkout has moved past its pin is
live state, printed by `node tools/check.mjs` and by the sync scripts, and
since 2026-09-02 never written to the file. This file used to copy the values
and was wrong within a day of doing so.

## Decided, not built

- ~~**A notes surface on guide pages.**~~ **BUILT 2026-09-10, `e3f7e86` — and
  this bullet still said "not yet written" through the 23:48 rewrite two hours
  after it shipped.** `js/guide.js`, 156 lines beside `js/exercise.js`, binds a
  field to every row atlas marks `produces`: **99 across the seven guides**,
  counted in the built pages, from 29 on `SG-create-basic-test-items-and-defaults`
  to 7 on `SG-ship-from-stock`. Local storage, no server, Markdown export, same
  as the exercise pages have had since 2026-09-06. The ✎ marks
  (`tokens.pencil` = 125) are what it was for.
- ~~**The two collision figures belong in `measure.mjs`, and are not there.**~~
  **BUILT 2026-09-11 — `tools/tile-looks.mjs`, twelve rows in `MEASURED` — and
  it found a live defect on its first run.** It resolves the diagram's own CSS
  out of a built page, specificity included, rather than asking a browser, so
  the figure survives in a diff; the trade is that it compares token names and
  cannot see two tokens that paint the same value in one theme, which stays the
  specimen's half. **What went in is not what the line asked for, and that is in
  the tool's own header:** `colliding by register` and `colliding by kind` were
  both written before the five categories were decided, so what is measured is
  by category, plus `looks-per-category`, plus the resolved look of each
  category as a row of its own.

  **The defect: every Checkpoint on the overview had lost its yellow** —
  `0px none`, confirmed in the browser before it was believed, on the document
  whose content is mostly gates. `63094e5` closed the three-sided Prerequisite
  card and, with the two `:not()`s that fix added, took the accent rule from
  (0,2,0) to (0,4,0) and past the rule protecting it. Fixed by keying the
  not-a-session refinement on Step, the one category it was ever about;
  `docs/diagram.md` §7 is the record, with the before-and-after
  geometry. **None of the three figures that were green could ever have caught
  it** — a missing colour is not a collision — which is why the look itself is
  now a row.
- ~~**The answer key on the public site.**~~ **CLOSED — and it was already
  closed when this bullet still said otherwise; corrected 2026-09-10 by
  measuring rather than re-reading the line.** The mechanism is as described:
  atlas withholds every `key` at the export tier until the exercise carries
  `reviewed: {by, date}`. What was stale is the state.
  `HOMEWORK-enterprise-planning-foundations` carries a complete
  `reviewed: {by, date}` attestation dated 2026-09-06 — the reviewer's name
  stays in atlas, where the frontmatter is — so its six answer-key
  sections publish: 32 `key` entries in the emitted JSON, `keyed: true`, 52
  reveal controls in the built page, and **52 on the live site** — fetched from
  `rux-sm.github.io`, HTTP 200, not inferred from the local build.
  `HOMEWORK-production-and-planning` renders no reveal, and **that is not a
  withholding**: its source carries zero `### Answer key` sections, so there is
  no key to attest to. Writing one is a separate piece of authoring in atlas,
  not a clearance waiting to land here.
- **`command` and `path` are still plain text — and since 2026-09-08 there is a
  ruling saying what they should be.** The measurement that made them plain
  stands: `.rux--tag` caps at 13rem and ellipsises, so a menu route was cut to
  192px, the thing a reader most needs whole. **What has changed is the answer.**
  This file used to say Carbon's answer was `.rux--tag-label-tooltip` and that
  using it was a conversation with rux-ds. That conversation happened, and
  rux-ds **rejected the tooltip on evidence**: every capture pairs it with an
  *interactive* tag, so it would make a tab stop of every route on a page that
  carries dozens, and the text would still be cut on paper and on touch. A
  tooltip is a route's second copy, not its first. **The ruling is that a route
  is a breadcrumb** — measured on running Carbon at 1280 with the same
  four-segment route in each: the tag lost 86px to ellipsis, the breadcrumb
  wrapped and lost nothing. **That ruling was built and reverted the same
  evening** — `f649219` then `57857ad`, on three findings recorded above
  `ROUTED` in `build.mjs`; it was right about clipping and wrong about the
  rest. A route renders as plain text today. This line used to end "Building it
  is 'Now' item 1", and there is no such item.

## Known losses, recorded so they are not rediscovered

- **The lane name leaves the session map when it is scrolled.** `.ln-dg-lane`
  sits in column 1 of a grid that scrolls, and the map is 2612px of figure in a
  1312px frame at 1440: scrolled to the far right, the label is 1053px off the
  left edge and **0 of 6 lane names are readable for the right-hand half of the
  document.** The overview does not scroll and is unaffected.

  **A fix was built and measured and is not taken.** `position: sticky` on the
  lane column holds all 6, drawn as variant B in the specimen on 2026-09-11. It
  was declined on the day the lane rule shipped: a rule holds your row while your
  eye travels right, which was the question being asked, and a sticky label is an
  opaque block painting over every tile that passes under it — a second thing to
  judge, not a free addition. `docs/diagram.md` §8 carries the
  measurements.

  **What that gives up:** a reader working the right-hand half of the map has the
  rules to keep their row and no name for it, and must scroll back to learn which
  lane they are in. The specimen reports `name held at far right 0/6` on every
  run, so the figure is live rather than a memory.

- **A container border on this site does not reach 3:1, and in the four brand
  themes neither does the one that carries a category.** Measured 2026-09-11
  on the rendered session map, prerequisite tile against the painted figure
  background, all eight themes: the dashed Prerequisite border reads 3.02
  (white), 3.32 (g10), 3.48 (g90), 3.01 (g100) — and 2.53 (geist), 2.11
  (linear), 2.63 (ant-dark), 2.31 (spotify). The four Carbon themes clear 3:1
  and the four brand themes do not.

  **This is not the prerequisites' defect and nothing regressed.** A plain
  Step's solid border reads 1.31 to 2.30 and fails in all eight, so the dashed
  border is the *more* visible of the two everywhere — the distinction the
  category depends on survives every theme, confirmed by looking at spotify
  and linear, the two weakest. The names and codes inside carry 10.5 to 18.4.
  So no information is only in a border.

  **What is given up by recording it here rather than fixing it:** the fix is
  a token question in rux-ds, not a rule here, and nothing measures border
  contrast in either repository. A future theme could land below linear's 2.11
  and nothing would say so.

- **The pencils have no gate behind them.** Rule 9 in atlas checked that every
  ✎ was collected by a Run record row, which made a marked step provably
  meaningful. The Run record was the only structure that could answer it. "A
  value worth noting" is editorial judgement and no check holds judgement. Both
  it and rule 8 were mutation-tested; this is tested coverage removed.
- **The flush-tag defect has no gate.** It is fixed, but only looking catches a
  recurrence.
- **This repository inherits rux-ds's class-wide ancestry declines.** Wiring
  `check-ancestry` in raised exactly two findings here, and both were
  adjudicated upstream rather than in a local list: `card__description` is
  *"the story layout, not the component"* -- all 17 card stories mount the card
  in a grid column and nothing in `css/rux.css` scopes one to it -- and
  `btn--icon-only` is *"the icon-tooltip the sink declines throughout"*, a
  standing decision where `aria-label` carries the name. rux-ds keyed both by
  class at `aa56e76`, so the gate reads 2 declined, 0 missing and exits 0.

  **What that gives up is stated in rux-ds and applies here too:** a new
  fragment using one of those 21 classes inherits the decline instead of being
  adjudicated on its own. So an icon-only button added to a page HERE, with no
  tooltip and no `aria-label`, will not be reported. The gate covers the
  wrapper class it was wired in for; it does not cover those 21.

- **`rux-ln-guides` was briefly public with its full history**, on 2026-09-01,
  before `rux-ln-notes` existed. It is private again and unreachable —
  never-fetched URLs 404 — but the commits exist. Deleting or rewriting that
  repository is a separate decision and nobody has taken it.

## Owed to atlas

**The heading used to end "and no open document carries them". That was wrong:
`exchange/send-back-2-reply.md` in atlas asks all four and has been waiting.
Corrected 2026-09-10, with every figure re-measured against the synced data at
the current PIN rather than restated.**

1. **Whether the uncovered session codes publish as name-only or are omitted.**
   Atlas asks this at `send-back-2-reply.md` line 96 and blocks its
   screen-reference emitter on the answer. Still unanswered; it is a decision,
   not a measurement.
2. **An `openIssues` count in the contract. SATISFIED — atlas built it, and
   this side renders it.** 9 documents carry a count; `e51ed95` draws 16 badges
   across those 9 documents and 7 index cards. This line used to end "the work
   left is on this side and is 'Now' item 3"; there is no work left and no such
   item.
3. **The re-measure atlas asked for.** It was right that the figure had drifted:
   this repository reported 58 distinct in-step codes against `288bf72`, atlas
   got 46 or 106, and **at the current PIN the count is 91 distinct `session`
   tokens across all 27 documents**, while `MEASURED` reads 58 in-steps and 108
   in-sources over the 7 guides alone. The three numbers are three different
   scopes, which is most likely what the disagreement always was. **Nobody has
   confirmed that**, and it is the next thing to establish before quoting any
   of them: agree the scope first, then the number.
4. **Cross-guide references arrive in two shapes.** Re-measured at the current
   PIN: **13 as `link`** and **28 as a `literal` carrying an `SG-….md`
   filename** — was 9 and 19 when first reported, so both grew and the split
   persists. Atlas has not been told the new figures.

## Not doing

- **The names list in CI, as a secret.** Considered and rejected 2026-09-02.
  It would add sensitive state that has to move whenever atlas's tuple does,
  its refusal message would have to be redacted to keep the names out of a
  public log, and it still could not protect the repository: Actions runs
  after the push, when the commit is already public history. It could stop a
  deployment, not a disclosure. The data route is closed by the hash in
  `data/guides/PIN` instead; the rest is held by the commit hook and the
  setup probe, and `AGENTS.md` records the accepted case.
- **Generated pages in an ignored directory.** Weighed again 2026-09-06 and
  kept as decided: the saving is about 1.7 MB of tracked HTML, and the cost
  is the rendered-page names sweep leaving the commit hook, which is the only
  place it can run. Admissible only if the hook builds and sweeps the output
  itself, every check is re-rooted at it, and equivalence is proven locally
  first; nobody wants it that much.
- **A fourth repository.** Publishing changed what this one contains, not what
  it is for.
- **Filtering rather than authoring.** Every time something had to come out —
  gap markers, issue ids, names, vendor filenames — the answer was to author it
  out upstream. Cutting a token from a finished sentence leaves damaged prose
  and every check stays green.
- **Merging any two of the three repositories.** All three boundaries are real:
  atlas is private because it holds evidence and Infor's documentation, this is
  public because it is the published site, and `rux-ds` is separate because it
  is a generic design system with its own consumers. Three arrangements were
  weighed on 2026-09-01 and all three rejected — one rulebook held in `rux-ds`,
  shared ownership of this repository by the other two, and merging atlas into
  this one. The third would have put client evidence on the open internet.
- **One agent context file across the family.** The three rule sets differ in
  kind, not in detail: `rux-ds` forbids inventing a class, atlas forbids
  answering from anything but `evidence/`, this forbids publishing what atlas
  holds back. A session loading all three reads two it cannot use. Atlas's
  `AGENTS.md` points here before any change to this repository, which is a
  pointer and not a merge.
