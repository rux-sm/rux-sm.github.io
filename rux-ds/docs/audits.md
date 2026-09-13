# Audits — what has been swept, and what has not

An audit is a deliberate read of the project as a whole, asking what is missing
rather than whether a known check passes. This file records that the sweep
happened, over what, at what commit — and, the half that matters, **what it did
not look at**.

## What this file is not

**Findings do not live here.** A finding is filed where its decision lives: a
roadmap section, `docs/log.md`'s "Decisions waiting on you" table, `docs/inventory.md`.
The ledger below carries a one-line pointer to that place and nothing more.

The rule is not tidiness. README already records that a rule stated twice
drifts, and `tools/lib/gates.mjs` records four documents disagreeing over one
word. An audit file holding its own copy of the findings is that defect with a
new filename — it would restate roadmap §4.7 and §4.8 on the day it was written
and contradict them a month later.

## Why this file exists

`docs/gate-coverage.json` was written because a gate never run against a target
is indistinguishable from one that passed. The same hole exists one level up:

**AN AREA NEVER AUDITED IS INDISTINGUISHABLE FROM ONE AUDITED CLEAN.**

An audit's scope statement — "I read the gate registry and CI, I did not run
`npm run verify` and did not open a browser" — is the only thing that separates
those two, and it is the first thing lost when the audit ends. The findings get
filed. The boundary evaporates.

The parallel is exact, and so is the limit `check-provenance` accepts by name:
this file cannot tell whether an entry is honest. It records a claim about a
sweep. Only the person who ran it knows if the sweep was real.

## The surfaces

An entry says which of these it swept. Naming them in advance is what makes
"not covered" mechanical rather than an exercise in remembering.

| | |
|---|---|
| **build** | `src/app.scss`, `package.json`, `.github/workflows/`, the committed-output check |
| **enforcement** | the 14 gates, `tools/lib/gates.mjs`, what each declares itself blind to |
| **behaviour** | `js/` — the modules, and what verifies them |
| **markup** | `sink/`, `templates/`, provenance labels |
| **output** | `css/rux.css`, `kitchen-sink.html`, `assets/icons.svg` |
| **docs** | `README.md`, `CLAUDE.md`, `docs/`, and whether a consumer can find markup |
| **distribution** | licence, version, changelog, how a consumer pins and detects staleness |
| **coverage** | which themes, widths and pages any measurement has actually run at |

## How to run one

1. **Record the commit first.** A finding is about a tree, and the tree moves.
2. **Read, do not assume.** The same rule the gates are built on. `ls` the
   directory before saying a file is missing; `grep` the roadmap before calling
   something unrecorded — most of it is recorded, and the interesting question
   is usually the sequencing rather than the absence.
3. **Separate on-record from unrecorded.** A gap the roadmap already names with
   a rejected alternative is not a finding; re-deriving it is the thing CLAUDE.md
   forbids. Say which phase owns it and move on.
4. **File each finding where its decision lives**, then point at it from here.
5. **Write down what you did not look at.** Not as a caveat — as the entry's
   payload. The next audit starts from it.

---

## Ledger

### 2026-09-01 · `380537f`..`23bf792` · agent-run, conversational

**Swept:** docs (every figure README quotes, re-measured) · enforcement (all 21 gates
run, three of them changed) · browser (all 38 cells swept TWICE — once after the sink
changed, once after the webfont) · markup (`sink/deferred/` listed against `sink/`) ·
output (`css/`, `portal.html`, `README.md` regenerated and diffed) · type
**Not swept:** behaviour internals (`check-behaviour` was RUN, 37/37, but no module was
read) · the screen-reader pass, which still needs a human · `docs/inventory.md`'s 83
rows were not re-read one by one, only counted · CUT dispositions were not re-examined

**What it started as:** "pull and check readme". The README's figure table was eleven
commits stale — 37 components against 50, 60.9 KB against 70.4, twelve JS modules
against fourteen.

**Six findings, all closed.**

| # | Finding | Status |
|---|---|---|
| 1 | README's figure table was typed by hand and every figure was wrong | **CLOSED** — generated from `tools/lib/stats.mjs`, CI-diffed, `380537f` |
| 2 | `portal.html` was generated AND CI-gated and still published `12 modules, 127.4 KB` and `2059 classes` — a hardcoded name array and a stale copy of a class regex `ownership.mjs` had already fixed | **CLOSED** — same commit, generator reads the directory |
| 3 | Six stubs in `sink/deferred/` shadowed fragments that ship; no gate reads that directory | **CLOSED** — `1f3da4d` resolved them, `4727b08` added the `shadowed` fault to `check-inventory` |
| 4 | The gzipped figure is not reproducible across Node versions and broke CI once, on the very check it had just been wired into | **CLOSED** — `0299867`, published floored to whole KB, margins recorded |
| 5 | The sweep method itself was wrong in both directions: a focus CLICK deletes markup-declared-open surfaces before they are measured, and a bare `Tab` leaves the first control focused and reports it as ringless | **CLOSED** — `f75ee18`, `Tab` then blur, written into the `sink-check` skill |
| 6 | `check-spacing` reported a COUNT, which is the one part of its output that neither travels between machines nor can be investigated | **CLOSED** — `1296840`, `KNOWN` list on `check-tags`' precedent, headline is now known/unknown |

**Two false positives were settled rather than carried.** The date-picker calendar
finding was measured against a RUNNING Carbon — `preview-preview-datepicker--single-with-calendar`
— which is what `docs/verifying-templates.md` prescribes and the only thing that could
answer it, since the captures carry markup and not behaviour. Carbon's own `--next`
calendar matches ours on every point the finding turns on, including not delegating focus
to a day, so `js/date-picker.js` was NOT changed. The 22 adjudicated spacing rows were
each traced to a cause: blockification by the sink's own wrapper, demo styling on both
sides of the grid comparison, a classic-against-`--next` reference, and values derived
from the text beside them.

**`check-rendered`'s zero is now demonstrated rather than assumed** — all three rules
driven red and restored. Recorded for whoever tries next: shrinking elements does NOT
fire `collapsed`, because Carbon's own layout holds the box at ~30px through
`height: 1px !important`; `display: none` is the shape that works.

**What was measured and NOT acted on**, so the next reader does not re-derive it: 23 of
the sprite's 59 symbols are referenced by nothing, costing 1,717 bytes gzipped per page.
Kept deliberately (roadmap §2.1, 2026-09-01), and `check-icons` still has no list that
distinguishes a kept symbol from an accidental one. Thirteen spacing rows on the sink
remain unknown. `docs/roadmap.md:2011` still gates Phase 7 on a Phase 4 that was declined
and may never run.

### 2026-08-29 · `f726cf1` · agent-run, conversational

**Swept:** build · enforcement · docs · distribution · coverage
**Not swept:** behaviour (`js/` read only as line counts, no module internals) ·
markup (no fragment or template read) · output (`css/rux.css` never opened)

> **Partly superseded 2026-08-29 by `14db75d`.** Building `portal.html` opened
> markup and output, ran `npm run verify`, and read the page in a browser in
> both themes. That is a later sweep's evidence, not this one's: the boundary
> above is what THIS audit covered, and it stands as written.

**Also not done, and each would change a conclusion below:** `npm run verify`
was not run, so every claim here is structural and none is a pass/fail state.
No page was opened in a browser. `docs/roadmap.md` was read at §4.7, §4.8, §5,
§7 and its section index — 89 KB was not read in full, so "unrecorded" below
means "absent from a targeted grep", not "absent from the roadmap".

| # | Finding | Status | Filed |
|---|---|---|---|
| 1 | No LICENCE or NOTICE; Apache-2.0 material is compiled into committed output | **CLOSED 2026-08-29** | Apache-2.0 shipped — `LICENSE`, `NOTICE`, build-written banners; roadmap §8.1 |
| 2 | `tests/` is empty — 1,942 lines in `js/` have no automated regression net | **filed §4.8** | `docs/roadmap.md` §4.8 · README decision table |
| 3 | g100 never measured — every browser baseline reads theme white | **CLOSED 2026-08-29** | `docs/gate-coverage.json` — all 25 cells re-read in both themes |
| 4 | Token value snapshot does not exist | on record, §4.8 | `docs/roadmap.md` §4.8 — the sequencing objection now stated there · README |
| 5 | No component → fragment → template index for a consumer | on record, §4.7 | `docs/roadmap.md` §4.7 — Phase 7, unstarted |
| 6 | No version, no tags, no changelog; consumers pin to a SHA | **filed §8.2** | `docs/roadmap.md` §8.2 · README decision table |
| 7 | `check-co-classes` prints no path; `check-coverage` has no per-file axis | on record | `gates.mjs` `knownGap` |
| 8 | `dashboard.html` untracked — §4.6 exit evidence outside version control | **CLOSED 2026-08-29** | **RESOLVED by deciding, not by fixing** — archived to `~/Developer/_archive/` and deleted. §4.6's entry is now the record and stands alone |
| 9 | `check-provenance` baseline in `gates.mjs` reads `38 files · 5 source`; a clean-tree run at `f726cf1` returns **39 · 6** | **CLOSED 2026-08-29** | **FIXED at source** — `gates.mjs` now reads 39 · 6, plus the module line |
| 10 | `tools/build-portal.mjs` asserts every `#i-name` it emits resolves in the sprite. It is a real check and is NOT in the gate registry | **filed §4.8** | `docs/roadmap.md` §4.8 · README decision table |
| 11 | `gates.mjs` `inputs` is per GATE, not per cell, so `kitchen-sink.html` ages every template's cells and `portal.html` cannot age its own | **IMPLEMENTED 2026-09-02 — review and sweep pending, NOT closed** | A browser gate declares `sharedInputs`, the shared half only, and `cellStates()` adds the cell's own page, so what ages a reading is declared rather than inferred. Supersedes `d63771c`, whose split asked whether an entry contained a swept page and would have silently dropped a future shared input whose directory held one. **Review found two faults in the draft**: the missing-`sharedInputs` guard sat after the `NEVER RUN` return, so a newly registered gate — the case it exists for — returned before reaching it, now validated before the ledger is read; and the declared list omitted `assets/fonts/plex.css`, since added. **The per-gate refinement landed 2026-09-02**, which is what it was open on; closing now needs only review by someone who did not draft it. Each browser gate now declares what it actually reads: `check-runtime-classes` takes `js/` and its page and no stylesheet at all; the other four take all three CSS layers, Plex and `js/`, with `sink/harness.css` as a per-page input where it applies. Measured one file at a time — a CSS or font change ages 27 cells and none of `check-runtime-classes`'; a `js/` change ages all 38; the spacing capture ages `check-spacing` alone |
| 12 | `check-icons` baseline in `gates.mjs` reads `58 symbols, 32 CUT or DEFERRED`; the committed sprite has held **59 · 29 unreferenced** for some time | **CLOSED 2026-08-29** | **FIXED at source** — found while adding the licence attribution, same class as finding 9 |
| 13 | `portal.html` links neither `css/rux-theme.css` nor `css/rux-overrides.css`. `AGENTS.md` requires every page to link both after `css/rux.css`; the other eleven swept pages do | **IMPLEMENTED 2026-09-02 — review and sweep pending** | Found reviewing finding 11's shared inputs. `tools/build-portal.mjs` now emits both after `css/rux.css` and the page is regenerated; the generated diff is those two links and nothing else. **The change is inert today and that is measured**: `rux-overrides.css` carries no live rule, and `rux-theme.css` carries one block, `[data-theme="rux"]`, which this `data-theme="white"` page does not match. It was drafted as changing the portal's look and does not — the value is that the portal stops being the exception the day a rule lands. Policy still requires the page be opened; the sweep already owed covers it |
| 14 | `sink/harness.css` is loaded by `kitchen-sink.html` alone and is a declared input to no browser gate, so the sink's readings do not age against the stylesheet positioning their specimens | **IMPLEMENTED 2026-09-02 — review pending** | Pre-existing, not introduced by finding 11's fix: no browser gate ever named it. Solved rather than deferred, by giving a gate an optional `pageInputs` map alongside `sharedInputs`, so a dependency belonging to ONE page can be declared as exactly that. `harness.css` is declared for the four gates whose reading it can move — rendered, spacing, behaviour, a11y — and not for `check-runtime-classes`, which compares DOM class sets that no stylesheet can alter. Measured: touching it ages 4 cells, all `kitchen-sink.html`, and no template |

Finding 9 was produced by running `npm run verify` at the end of this sweep —
after the entry above had already recorded that verify was not run. Both
statements stand: the sweep's *findings* were reached without it, and the one
result it did produce is the ninth. It contradicts a `baseline` field in the
gate registry, which is the second kind of figure `gates.mjs` names — a record
with a date, not an assertion — so a stale one is expected and is still worth
correcting at the source.

Finding 10 is a check this audit's own follow-on work created, and it is
recorded here rather than registered because the registry says fourteen and
three documents agree with it. Adding a fifteenth is a decision. It earned its
keep on its first run by catching `#i-katex`, a glyph nothing in the sprite
defines -- the silent-blank-icon failure CLAUDE.md names.

**Finding 3 is closed, and this is what closing one looks like.** On 2026-08-29
every browser cell was re-swept in g100 as well as white, the theme asserted from
a resolved token each time. All 25 came back with the same figures as their white
readings and `check-a11y` found nothing in either theme. The row stays in the
table struck through rather than deleted: a ledger that edits away its own
history is worth less than one that shows the correction.

That sweep also honoured condition 6 for the first time on record -- the
instrument was driven red (12 findings, the predicted figure) before nineteen
greens were written down. A green run nobody has seen go red is the same
category of non-evidence as a gate never pointed at a target, which is the
defect this file exists for.

**Filing completed 2026-08-29.** Every row now points somewhere a decision can be
made, which is what this ledger asked for and did not have when it was written. What
changed is only WHERE the findings live — none of them was decided by being filed, and
six of them are now rows in `docs/log.md`'s "Decisions waiting on you" table precisely because
they are still open.

Two closed rather than filed. Finding 3 was closed by re-sweeping all 25 cells in both
themes. Finding 9 was a stale `baseline` field, which `gates.mjs` names as a record with
a date rather than an assertion; it was corrected at source, so there is nothing to
decide and nowhere to point.

**The earlier version of this paragraph said five rows had nowhere to point yet.** That
was true when written and is no longer. It is replaced rather than deleted, because a
ledger that edits away its own history is worth less than one that shows the correction.

### 2026-08-30 · `c1352a1` then `643a20e` · tab-order sweep, agent-run

Two commits because the sweep ran in two halves: `kitchen-sink.html` at `c1352a1`,
then the six templates at `643a20e`, after the first half's finding had been fixed.

**Swept:** markup (all eight pages walked as RENDERED pages, not as files) · coverage
(the tab order had never been walked end to end on any page — README said so)
**Not swept:** build · distribution · output (`css/rux.css` never opened) · docs ·
behaviour (`js/` read only to answer whether `ui-shell.js` selects the side nav by role
or by class — it is by class)

**Method, because it decides what the result means.** Real `Tab` key presses into the
served page, a `focusin` listener recording every landing, and the cycle closed by
detecting the return to stop 0. Tab order was then compared against DOM order with
`compareDocumentPosition` per transition. 245 stops on the sink; 9 to 23 on each
template.

**What the sweep did NOT look at, and it is not a small list.** Default state only —
no modal, menu or popover was opened, so focus TRAPPING is untouched and remains
`check-behaviour`'s. Theme white only. The `Tab` key only: no reverse `Shift+Tab` pass,
and no arrow-key navigation inside composites, so a roving tabindex was checked for how
many stops it exposes and not for whether the arrows move the cursor. The
document→browser-chrome→document boundary cannot be tested in this pane at all, because
focus wraps 244→0 directly instead of passing through the URL bar.

> **Partly superseded 2026-08-30 by a second sweep at `722e7db`.** The reverse pass and
> the arrow keys were both run: `Shift+Tab` on all seven pages against the forward cycle
> — 0 mismatches, wrapping included — and the arrow patterns driven by real keys, where
> tablist arrows rove and select and skip the disabled tab, a vertical list declines the
> horizontal arrows, radio arrows move and check, and menu arrows rove with Escape
> restoring focus to the trigger. **The rest of the boundary above still stands**:
> default state only, white only, and the document→chrome boundary still untestable.
> That is a later sweep's evidence, not this one's, and the paragraph above is what THIS
> sweep covered.
>
> **It also found what the first sweep could not have.** Enter and Space on a focused
> button deliver `keydown` and `keyup` with `isTrusted: true` and produce no `click` in
> this pane, so nothing a button opens can be opened from the keyboard here. It is the
> pane and not the page — `js/overlay.js:224` preventDefaults on Escape alone — and it
> is filed where it will be read before the next attempt: README's §4.5 entry, whose
> claim about key delivery was true and incomplete, and the `sink-check` skill, as its
> seventh condition.

**And one thing it structurally cannot see, demonstrated the same day.** The sweep
walked `templates/form-page.html` and reported it clean — 19 stops, skip link first, no
divergence from DOM order — while a 0px gap sat between its `h1` and its form, the title
resting on the first field. A tab sweep reads the ORDER of focus and says nothing about
the SPACE between two elements that merely touch. That one was found by rux opening the
page.

| # | Finding | Status | Filed |
|---|---|---|---|
| 1 | `sink/ui-shell.html` carried `role="menu"` on the side nav `ul`; Carbon renders it bare and all six templates already did. An AT was told it entered a menu containing no menu items | **CLOSED 2026-08-30** — fixed `643a20e` | Blind spot filed: `docs/roadmap.md` §4.8 · README gate table, `check-a11y` row |
| 2 | `templates/table-page.html` had no `h1`–`h6` anywhere; its only title was a `div` | **CLOSED 2026-08-30** — fixed `e62850f`, `8f3d932` | Blind spot filed: `docs/roadmap.md` §4.8 · README gate table, `check-a11y` row |
| 3 | `templates/form-page.html` opened its form at the `h1`'s exact bottom edge, measured 0px | **CLOSED 2026-08-30** — fixed `d58b501` | Not filed as a blind spot: no gate claims to measure this, and `app-shell.html` already carried the note recording the same fault |

**Findings 1 and 2 shipped on pages that passed all seventeen gates**, which is why each
is filed in §4.8 as a blind spot rather than only as a fix. Their decisions — whether
either becomes a rule — are open there, with the cost of writing each recorded beside it.

**Finding 3 is not a gate gap and is deliberately not filed as one.** `app-shell.html`
already carried the note naming this exact fault, in as many words, and `form-page.html`
was the last template still carrying it. Nothing was missing except somebody looking.

**Not a finding, on record already.** That `check-a11y` declines to judge whether a tab
order makes SENSE is stated in its own header and in README's table; this sweep is the
manual pass that header points at, not evidence of a gap.
