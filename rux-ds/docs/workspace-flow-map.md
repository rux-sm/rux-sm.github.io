---
id: rux-ds-workspace-flow-map
type: reference
status: draft
updated: 2026-09-10
covers: [rux-ds, rux-sm.github.io, rux-ln-notes, rux-scheduler]
verbs: [1, 2, 3, 4]
---

# The rux-ds workspace — flow map

**This file is the source. Any picture is generated from it.** Sections 3 to 6
are the drawing: lanes, stages, nodes, edges. No coordinate, colour or pixel
appears anywhere in this document.

**It composes and owns nothing.** Every command below is already carried by
`docs/verbs.md`, every rule by `AGENTS.md`, every count by `npm run gates`.
Section 5's **Verb** column is the link back, so a step that moves in the card
is findable here rather than silently stale. If this map and `docs/verbs.md`
disagree, the card is right and this is the bug.

**It answers a different question from the card.** `docs/verbs.md` answers
*what do I type*. This answers *where am I in the chain, what can refuse me
here, and what happens with no message at all*.

**REDRAWN 2026-09-10, after roadmap §8.4 was taken.** The version before this
one drew an eight-stage, twenty-one-node chain built around vendoring: cutting
a tag was a boundary, and a separate, deliberate "adopt" phase moved each
app's copy afterward — sometimes right away, sometimes not for days. No app
vendors a copy any more (§8.4, §8.6, all steps done 2026-09-10; `docs/log.md`
has each one's proof), so that whole phase — stage 7, nodes 17 to 20 in the
old numbering — is gone rather than renumbered around a gap. What replaces it
is not a manual step at all: **cutting a tag now runs a CI job that checks
every served app against it before anything deploys**, so the boundary and
the adoption happen in the same act. Between the notice this section used to
carry and this redraw, the chain was walked for real twice more — a release
that found a genuine defect in that new CI check and was rolled back
automatically by design, then a second release that carried the fix. Both are
in section 7 now, in place of the two failure modes that only applied to
vendoring and no longer can.

---

## 1. Decisions to settle before it is drawn

Five, and only the first is a drawing question.

| | Decision | Options | Recommended |
|---|---|---|---|
| **D1** | **Canvas** | (a) one wall chart, all four lanes, commands on every box · (b) page-fit, commands dropped to the node table · (c) split — make side, ship side | **(a)**. The command is the reason to have it open beside the terminal; without it the chart only restates the card's contents |
| **D2** | **Where it lives** | (a) a figure inside `docs/verbs.md` · (b) its own `reference` document that the card and `README.md` point at | **(b)**. It spans four repositories, so hanging it off one card understates it |
| **D3** | **Scope** | Whether to draw the 26 gates individually, or as one node | **One node.** `tools/lib/gates.mjs` is the registry and drawing it twice is the duplication this repository keeps being bitten by |
| **D4** | **The prose panels** | (a) inside the figure as SVG text · (b) printed beside it | **(b)**. Prose inside markup is invisible to every gate here. Section 7 already holds it as prose |
| **D5** | **Format** | (a) hand-drawn SVG now · (b) generated from sections 3–6 | **(b) as the destination**, (a) is acceptable first. Nothing generates a diagram in this repository yet, and this document is the argument for building it |

---

## 2. What the reader is meant to take from it

Three things, in this order. If a change to the map makes one of them harder to
see, the change is wrong.

1. **The tag is the boundary, and it is a shorter one than it used to be.**
   Everything left of it can be redone for free. Right of it, every served
   app already reads whatever the tag carries the moment it deploys — there
   is no second, separate step left to lag behind. Stage 6 exists to make the
   boundary a place rather than a step; it no longer needs stage 7 to finish
   the job.
2. **Passing every gate is not the finish.** Stage 4 is a separate stage on
   purpose. Five shipped defects passed every gate this repository has.
3. **The chain fails quietly in four places, and two more fail LOUDLY and
   still needed a real release to find them.** Section 7 states all six.

---

## 3. Lanes

Ordered top to bottom. The lane names the place, so a node never repeats it.

| | Lane | Carries |
|---|---|---|
| 1 | rux-ds | Where a class, a rule and a page are born. The only place they are born |
| 2 | The browser | The served page. Everything a file cannot answer |
| 3 | The record | What the next session reads before it starts |
| 4 | Release | The tag, and every app that reads it live |

---

## 4. Stages

Ordered left to right. Stage 6 is the boundary; the renderer draws that, this
file states it.

| | Stage | What changes in it |
|---|---|---|
| 1 | Decide | Nothing yet. Which tier the change is, and which file it belongs in |
| 2 | Change | The edit exists on disk |
| 3 | Prove | Every Node gate has run and returned an exit code |
| 4 | Look | A person has seen the page in a browser |
| 5 | Record | The state files and the log say what happened |
| 6 | **Release** | **The boundary.** A tag exists, checked against every served app before it deploys |
| 7 | Confirm | Each site is open, live, in every theme |

**Stage 7 used to be stage 8, and there used to be a stage 7 between this one
and the boundary: Adopt, where each app's `vendor/` and `PIN` moved.** Gone
with vendoring itself. What confirms a release now is the same act it always
was — open the site — with nothing to do first.

---

## 5. Nodes

`#` is reading order across the whole map. `Kind` drives how a node is drawn and
nothing else:

- **decision** — a judgement, no command
- **step** — you do something
- **gate** — it can refuse you
- **read** — you look; nothing changes
- **transfer** — the act that crosses a boundary

**Verb** names the entry in `docs/verbs.md` that owns the detail. This map states
the act; it never restates the detail. `docs/verbs.md` carries four verbs now,
not five — the old verb 4, moving every app's pin, has nothing left to do.

### 5.1 rux-ds

| # | Step | Command or file | Kind | What happens | Verb |
|---|---|---|---|---|---|
| 1 | **Start clean** | `git pull --ff-only && npm install --ignore-scripts` | step | The install matters only when `package.json` moved. Skipping it there makes node 6 report against the wrong tree | before any |
| 2 | **Classify the change** | `AGENTS.md` → Change classification | decision | Tier 2 — a gate, a baseline, a fixture, `CONTROL_FILES`, `AGENTS.md` itself — **stops here** and is proposed as a diff. Tier 3 is normal work | before any |
| 3 | **Place the change** | `AGENTS.md` → Where a change goes | decision | A colour → `css/rux-theme.css`. A component rule → `css/rux-overrides.css`. Which components exist → `src/app.scss`. Never `node_modules/@carbon` | 2 |
| 4 | **Copy a template** | `templates/*.html`, skill `rux-ds-page` | step | Never start from scratch or from a guess. Each template is a whole page, shell included | 1 |
| 5 | **Diff the markup** | `node tools/diff-fragment.mjs <name>` | gate | Against `docs/carbon-*.json`, the captured Carbon DOM. Never against live Storybook, never against a guess | 1 |
| 6 | **Run every Node gate** | `npm run verify` | gate | 21 gates plus the build. **Check the exit code, do not grep the output** | 1, 4 |
| 7 | **Name what was touched** | `node tools/check-controls.mjs` | read | Says which controls the diff touched. Blocks nothing, because one maintainer has nowhere to escalate | 2 |

### 5.2 The browser

| # | Step | Command or file | Kind | What happens | Verb |
|---|---|---|---|---|---|
| 8 | **Serve the page** | `node tools/serve.mjs` → `localhost:8640`, every site on one origin, or `npm run serve` in rux-ds → `localhost:8642` | step | An app's own launcher delegates to rux-ds's workspace server, because its pages link `/rux-ds/…` and cannot be shown styled from their own folder alone | 1 |
| 9 | **Run the five browser gates** | skill `sink-check` | gate | `check-a11y`, `check-rendered`, `check-runtime-classes`, `check-spacing`, `check-behaviour`. Pasted into the console of the served page — they are not Node tools, deliberately | 1 |
| 10 | **Record the sweep** | `npm run gates` | gate | Says which page each browser gate was last run against, and **fails on a page never swept**. This is where the counts live. Never in prose | 1 |
| 11 | **Open the page** | no command | gate | Every theme — white, g10, g90, g100, rux — from the account panel. **This is the only node that catches a page that compiles, resolves and still renders wrong** | 1 |

### 5.3 The record

| # | Step | Command or file | Kind | What happens | Verb |
|---|---|---|---|---|---|
| 12 | **Log the pass** | `docs/log.md` | step | Every dated pass, measurement and answered decision. Including the ones that were wrong | 1–4 |
| 13 | **Update the state** | `README.md` → Picking this up | step | Current state and what is open. A correction is made in the open, not quietly | 1–4 |
| 14 | **Commit** | `.githooks/commit-msg` | gate | `type(scope): Subject`, subject ≤ 50 characters, body wrapped at 72, authored by rux alone. Armed once per clone with `git config core.hooksPath .githooks` | 1–4 |

### 5.4 Release

| # | Step | Command or file | Kind | What happens | Verb |
|---|---|---|---|---|---|
| 15 | **Record a removal** | `CHANGES.md` | step | **Only when a class or component left.** That makes the tag a minor; otherwise a patch. Additions are safe and are not recorded. Nothing has been removed yet | 4 |
| 16 | **Cut the tag** | `git tag vX.Y.Z` then `git push origin vX.Y.Z` | transfer | **The boundary.** Two commands — one carrying both is refused. rux's call alone | 4 |
| 17 | **Every served app is checked against the tag, before anything deploys** | rux-ds's own `.github/workflows/pages.yml`, the `consumers` job | gate | Checks out the hub, Notes and the scheduler at their `main` and runs the shared check on each against this exact tree — `--ds` absolute, `--hub` the account-root checkout. An app that still vendors (none do) is reported `NOT RUN` with its pin, never a silent pass. **A red run deploys nothing; the previous release keeps serving** | 4 |
| 18 | **Open each site** | the live URL | gate | Header, switcher, account panel, theme. Record the pass in `docs/log.md` | 4 |

**What used to be here, in the old numbering: node 17 moved every app's pin by
hand or with `tools/roll-out.sh`; nodes 18–20 read a drift report, read
`CHANGES.md` between two tags, and committed a pin move per app.** All four
are retired along with vendoring — there is no copy to move, no pin to
commit. `CHANGES.md` is still read; it is just no longer a step between the
tag and the sites reading it, because nothing sits between them any more.

---

## 6. Edges

`flow` is the sequence. `branch` splits by what kind of change it was. `feed` is
a dependency that is not a sequence — the thing must be true, but you do not
walk it.

| From | To | Kind | Label |
|---|---|---|---|
| 1 | 2 | flow | — |
| 2 | 3 | branch | tier 3 — normal work |
| 2 | — | branch | **tier 2 — stop, propose a diff, do not judge it yourself** |
| 3 | 4 | branch | the change is a page |
| 3 | 6 | branch | the change is a colour or a rule |
| 4 | 5 | flow | — |
| 5 | 6 | flow | — |
| 6 | 7 | feed | only when the diff touched a control |
| 6 | 8 | flow | exit code 0 |
| 8 | 9 | flow | — |
| 9 | 10 | flow | — |
| 10 | 11 | flow | — |
| 11 | 12 | flow | — |
| 12 | 13 | flow | — |
| 13 | 14 | flow | — |
| 14 | 15 | branch | releasing |
| 14 | — | branch | not releasing — the chain ends here, on `main` |
| 15 | 16 | flow | — |
| 16 | 17 | flow | **automatic — not a branch any more** |
| 17 | 18 | branch | the consumers job passed; `deploy` runs |
| 17 | — | branch | **the consumers job failed — `deploy` is skipped, the previous release keeps serving** |

**Node 16 to node 17 used to say "only when there is a reason" — that a tag's
existence did not by itself move anything, and moving every app was a
separate, deliberate act with its own commit. That is the one sentence this
redraw deletes rather than corrects.** Cutting a tag now runs `17` every
time, unconditionally, inside the same CI run that decides whether `18` ever
has anything to open. The pause the old design gave a person to notice
something before every app moved is gone; what replaces it is a gate that
runs before deploy rather than after it, on every single release, with no
one having to remember to invoke it.

---

## 7. Prose beside the figure

Per D4 this is printed next to the drawing, not inside it.

### 7.1 Six ways this flow fails

**Every gate passes and the page is still wrong.** The gates read files and
attributes. They cannot see a component that compiles, resolves and renders
wrong. **Five shipped defects passed all of them.** Node 11 is the only thing
that has ever caught these, and twice it was the only thing that found the bug.

**The right gate, run on the wrong page, reads zero.** `check-a11y` reported no
findings on the kitchen sink for as long as the batch-bar defect existed,
because the sink ships that bar open and the defect only occurs when it is
closed. It surfaced on `templates/table-page.html`. **Run the browser gates on
the templates too, not only on the sink.**

**A count typed into prose goes stale and nothing re-reads it.** The README said
"47 of 47 sweep cells" for two days after the number was 50. The gate registry's
own header said 14 gates when the answer was 21. Under an agent a stale sentence
is not untidiness — it is a corrupted variable. `npm run gates` and
`portal.html` are where counts live; `docs/agent-tooling.md` is the argument.

**The work is done and no tag carries it, and this is now the failure with the
shortest fuse rather than the longest.** In the vendored chain this could sit
for days — nothing measured the distance, so an app kept reading an old pin
and looked correct doing it. In the served chain the gap between "done" and
"live" is one `git tag` and `git push` away, and steps 4 through 7 of §8.4
sat on `main`, fully proven, before any of them shipped — measured at the
time as zero unreleased distance the moment each tag actually moved.
`git log $(git describe --tags --abbrev=0)..main --oneline | wc -l` is still
the command that answers it truthfully, and it still drifts the moment the
next commit lands; there is simply less room left for it to drift into.

**A release found a real defect in the gate meant to protect it, because
nothing before that release had ever run in the exact shape a release runs
in.** Cutting `v0.1.16` (2026-09-10) triggered node 17 for the first time
against all three real apps at once, and it refused: the hub's own turn in
the consumers loop checks it against itself, so `--hub` names the same
directory as the positional app path, and `tools/app-check.mjs`'s argument
parser excluded that path from the positional search **by value** rather
than by position — the app path and the `--hub` value read identical, so
neither was found, and the check silently fell back to checking rux-ds's own
`sink/deferred/` fragments instead. `deploy` was skipped; `v0.1.15` kept
serving throughout, which is node 17's whole job working exactly as drawn.
Three earlier proofs — a CI rehearsal on a throwaway branch, a local check of
the hub without `--hub`, and the shared check's own 24-case self-test — each
verified a real scenario, just never this one. Fixed by tracking which
*argument index* each flag consumed rather than which value; `v0.1.17`
carried the fix and is the release actually live. `docs/log.md`, 2026-09-10,
has the full account.

**A generated app's own gate refused every legitimate commit to its own
generated output, and had done so silently since the day it was added.**
`rux-ln-notes`' `check-build.mjs` rebuilds the site and compares the result
against `git status`, which reports a file as changed whenever it is
staged-modified relative to `HEAD` — true of every normal content commit to
`guides/`, not only a stale one. It had refused any such commit
unconditionally since 2026-09-09; nothing had touched `guides/` since, so
nothing had hit it until the served-shape move itself did, on 2026-09-10.
Fixed by comparing the working tree against the index instead (`git diff`),
which asks the right question — did rebuilding find something *not already
staged* — and proven both directions: a deliberately stale page was caught
and refused, then the real, legitimately staged commit passed clean through
the real hook. Notes has no `roll-out.sh` equivalent to blame this on any
more; it found its own bug on its own gate, which is the harder case to
excuse and the one this repository's rules were written for.

### 7.2 What has actually been walked

**Verbs 1 and 2 are walked constantly** — pages and rules, unchanged by any of
this.

**Verb 3 has been walked at least twice**, adding rux-scheduler and this
repository's own site to the switcher; nothing about `§8.4` changed what verb
3 does.

**Verb 4 — release — has now been walked for real more times than any other
verb in this family, including the one time it refused.** Thirteen tags
before `§8.4`, then `v0.1.12` through `v0.1.15` moving the plan itself, then
`v0.1.16` — the first release checked against every served app in the exact
shape a release actually uses, which found the argument-parsing defect
7.1 describes and deployed nothing rather than something wrong — then
`v0.1.17` carrying the fix, live within the hour. The rollback path
`docs/verbs.md` verb 4 documents (`gh workflow run pages.yml --ref vX.Y.Z`)
was rehearsed the same day, both directions, before any of this: redeployed
`v0.1.14`, confirmed the stamp, redeployed `v0.1.15` again. **This is the
first time this map can point at a real, unrehearsed refusal and its
recovery, rather than a self-test or a throwaway branch — which is exactly
what node 17 exists to make ordinary rather than remarkable.**

**Nothing has ever been removed.** `CHANGES.md` reads "Nothing removed yet", so
node 15 has never fired and every tag so far has been an addition or a fix.

---

## 8. Deliberately not on the map

| Left off | Why |
|---|---|
| The 26 gates one by one | `tools/lib/gates.mjs` is the registry and `npm run gates` is the reading. Drawing them here makes a second list to go stale |
| The build steps inside `npm run verify` | `build`, `sink`, `portal`, `readme`, `blocks`, `builder`, the two theme builders — they are one node because you never run them singly |
| Carbon's own compile and the strip | Roadmap §1 owns it. It happens once per Carbon version, not once per change |
| `rux-backend` | It has no page and never vendored anything. Its own decisions live in roadmap §4.13 |
| `rux-ln-atlas` | Private. Nothing from it appears here, by the rule at the top of `AGENTS.md` |
| The screen-reader pass | It has no command and no gate. `docs/screen-reader-pass.md` owns it, and it is the one thing on this chain a person must do with an assistive technology running |
| The `consumers` job's own internals — which apps it checks, in what order, how `--hub` and `--ds` resolve | Node 17 states the act. `tools/app-check.mjs` and `.github/workflows/pages.yml` in rux-ds own the mechanism, and 7.1 already names the one defect that mattered |

---

## 9. Sources

1. **`docs/verbs.md`** — the card. Every command in section 5 is carried by one
   of its four verbs, named in the **Verb** column. This map adds no command of
   its own.
2. **`AGENTS.md`** — the policy behind nodes 2, 3 and 14, and the rule that
   makes node 2 a stop rather than a step.
3. **`docs/agent-tooling.md`** — the six instruments, and the argument behind
   failure three.
4. **`README.md` and `docs/log.md`** — the state and the record. Failures five
   and six, and the release history in 7.2, are all read from the log.
5. **`package.json` and `tools/`** — every command above was confirmed to exist
   on 2026-09-10. `app-check.mjs`, `diff-fragment.mjs`, `check-controls.mjs`,
   `serve.mjs`, `drift.mjs` and `new-project.sh` are all present.
   `tools/roll-out.sh` is not: it was retired the same day, with nothing left
   for it to do — roadmap §8.4 step 6.

**Two sources were stale and this map did not inherit either, both fixed the
same way.** `docs/verbs.md`'s closing table had no row for `rux-scheduler`
until `0720737` (2026-09-05); this map never carried the gap, because section
3 lists the lane rather than copying that table. This section's own
"§8.4 was taken" state was itself stale for part of one day, 2026-09-10 — the
first pass of this redraw added a superseded notice without touching sections
4 through 6, on purpose, rather than risk a rushed renumbering; this version
is the actual redraw. Both are recorded as closed findings rather than
deleted, on the same rule that keeps a correction visible in `docs/log.md`:
silently removing a note that turned out to be fixable reads as though the
map never caught it.
