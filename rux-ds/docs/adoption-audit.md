# Adoption audit — rux-ds against `reference/agent-self-correction-loop.md`

**Tree:** `3798331`, clean working tree, 2026-08-31.
**Method:** files read and cited by line; `npm run verify` run and its **exit
code** taken directly (not through a pipe); one behaviour probed in an isolated
copy of the tree under the scratchpad, never in the repository.
**Scope:** audit only. Nothing in the repository was modified. This file is the
only one created.

---

## Acted on, same day

The four verdict items were implemented on 2026-08-31, after the audit was
written. **The findings below are left exactly as written** — a ledger that edits
away its own history is worth less than one that shows the correction, which is
`docs/audits.md`'s rule and applies to this file too. This section is the status
column.

| # | Finding | Status |
|---|---|---|
| 1 | Coverage ratchet is prose, not code | **CLOSED** — `tools/check-coverage.mjs` refuses to lower a baseline and names the components; `--update --force` is the deliberate escape, with no npm script in front of it. All three paths probed in a copy of the tree: refuse (exit 1, wrote nothing), force (wrote, printed what it lowered), ordinary update (unchanged). README's ratchet paragraph now says what the code does |
| 2 | No control-integrity check | **PARTLY CLOSED, by design** — `CONTROL_FILES` in `tools/lib/gates.mjs` (35 paths), read by the new `tools/check-controls.mjs`, printed as non-blocking `::warning::` lines by a new CI step. Visibility, not approval. The digest-verified baseline is still absent and still deliberately unbuilt |
| 3 | `Bash(node -e ' *)` auto-approved | **CLOSED** — removed from `.claude/settings.local.json`, 20 entries down to 19. **The Supabase JWTs in `~/.claude/settings.json` were NOT touched**: that file is outside this repository, and removing an allowlist entry does not un-expose a token. Rotation is rux's, and it is the only fix |
| 4 | Every browser reading uncurrent | **OPEN, unchanged** — still 0 of 38 current. Not a defect to fix in code; it needs a sweep |
| 5 | `agent-tooling.md` says the repo has no commit hook | **OPEN** — not in the verdict, so not touched. `docs/agent-tooling.md:90` still states a falsehood about a control, and the smaller real gap under it (nothing verifies `core.hooksPath` is set in a fresh clone) is still open |
| 6 | No `AGENTS.md`, no untrusted-data policy, no tiers | **CLOSED** — `AGENTS.md` carries `reference/tier-rules-block.md` with both placeholders resolved, plus two paragraphs this repository needed and the block does not have: tier 1 does not exist here and must not be built per-project, and tier 2 has no independent reviewer. `CLAUDE.md` points at it and carries the untrusted-data sentence inline |

**One deliberate divergence from the reference, recorded because it is a
judgement call.** §5 says keep the policy in `AGENTS.md` and make each vendor
file a pointer. The tier block's own argument cuts the other way — policy that
binds only when an agent chooses to open a file does not reliably bind, and
`CLAUDE.md` is what loads automatically. Duplicating the table into both would
violate this repository's older rule that a rule stated twice drifts. So the
table lives once, in `AGENTS.md`, and `CLAUDE.md` carries an imperative pointer
naming the paths that trigger it plus the one sentence too valuable to indirect.
If an agent ignores that pointer, the tiers do not bind. That is the residual
risk, and it is accepted rather than solved.

`npm run verify` exits 0 after all of it. Its exit code was read directly, not
through a pipe.

---

## What this audit did not cover

Stated first, because it is the payload — the same rule `docs/audits.md` runs on.

- **No browser was opened.** All five browser gates went unrun. Their recorded
  state is quoted from `npm run gates`, not re-measured.
- **`docs/roadmap.md` (89 KB) was not read in full.** It was grepped for
  `coverage:update`, `ratchet`, `AGENTS.md`, `untrusted`, `prompt injection`,
  `sandbox`. "Unrecorded" below means "absent from those greps", not "absent
  from the roadmap".
- **No network call was made.** Whether `rux-sm/rux-ds` has branch protection,
  required checks, or restricted push is **not verified** — it cannot be
  determined from the clone.
- **`js/` was not read.** No module internals were opened.
- **The reference's §2 harness code (~790 lines) was read for contract, not
  line by line.** Its three supervisor interfaces and the tier table were read
  in full.
- **The three global notifier hooks were identified by filename only.** Their
  contents were not read, so "they enforce nothing" is inference from their
  names and event types, not from their code.

---

## Inventory — what exists today

### 1. How agents are invoked, and what bounds them

There is no harness. The agent is a Claude Code session driven by a human in the
chair. Nothing in the repository invokes a model.

| Bound | Enforced outside the model? | Evidence |
|---|---|---|
| Wall-clock deadline | **No** | nothing in the repo or settings |
| Token / cost budget | **No** | nothing |
| Tool-call ceiling | **No** | nothing |
| Changed-file / diff-size cap | **No** | nothing |
| Network | **Partly** — reaching it needs an allowlist match or a prompt | `.claude/settings.local.json` |
| Tool permission | **Yes** — allowlist plus interactive prompt | `.claude/settings.json`, `.claude/settings.local.json`, `~/.claude/settings.json` |

Everything else is instruction to the model: `CLAUDE.md`, `README.md`, and the
gate headers. They are good instructions. They are not enforcement, and the
reference's line applies exactly — passing `authorizationScope` to a model is
context, not a control.

The five hooks in `~/.claude/settings.json` are `Stop`, `PermissionRequest`,
`PreToolUse:AskUserQuestion`, `UserPromptSubmit`, `SubagentStop`, and every one
of them runs a `claude-notifier-on-*.js`. They notify. **No hook gates a write,
an edit, or a Bash call.**

### 2. Isolation

No sandbox. The session runs with the user's own filesystem and credentials;
`permissions.additionalDirectories` adds `/tmp`. `.claude/worktrees/` shows git
worktrees have been used for isolation of *work*, not of *authority* — a
worktree shares the credentials and the network.

Process termination: not applicable, since nothing here supervises a child
process tree. `tools/serve.mjs` is started and stopped by hand.

The allowlists are the whole of the boundary, and they are wider than they look:

- `.claude/settings.local.json:9` — `Bash(node -e ' *)`. **Arbitrary JavaScript,
  auto-approved.** It can write any file in the tree, including any gate, and
  reach the network via `fetch`. Every other entry in that file is narrower than
  this one line makes irrelevant.
- `Bash(npm install *)` — network fetch plus package lifecycle scripts. (CI is
  careful here — `--ignore-scripts` — and the local grant is not.)
- `~/.claude/settings.json` carries **111 allow entries**, accreted across
  projects, and they apply here. Five are arbitrary-execution wildcards
  (`python3 -c ' *`, `osascript -e ' *`, `pip3 install *`, `defaults write *`,
  and a venv python). **Three contain live-looking Supabase `apikey` and
  `Authorization: Bearer` JWTs in full**, for `white-boat-9932.rux-smercado.workers.dev`.

`git push` is **not** allowlisted in any of the three files, so a push still
raises a prompt.

### 3. What verification runs, what it emits, who consumes it

`npm run verify` chains a build and sixteen Node gates with `&&`
(`package.json:20`); CI runs that one line (`.github/workflows/gates.yml:45`)
and then asserts the committed build output is clean (`:58`).

**Run at `3798331`: exit code 0.** Full log in the scratchpad.

Output format is human-readable text plus an exit code. There is no machine-readable
report — no SARIF, no versioned JSON result, no run or invocation identifier.
`grep` for `sha256|createHash|digest` across `tools/`, `package.json` and
`.github/` returns **nothing**. The only consumer of a gate's result is the
person or agent reading the terminal, plus CI reading the exit status.

Three JSON files are *state*, not reports: `docs/coverage.json`,
`docs/inventory.json`, `docs/gate-coverage.json`.

### 4. What is treated as a control, and what protects it

`tools/lib/gates.mjs` is a genuine registry in the reference's §3 sense —
per-gate `catches`, `blindTo`, `inputs`, `sideEffects`, `baseline`, and file and
page targets. It is better than the reference's example in one respect (below).

It has **no `controlFiles` field, no `changeControl` block, no owner, no schema,
and no digest.** There is no control-file list anywhere in the repository.

Nothing stops an agent editing a gate. CI runs the repository's own gates from
the same commit, so a weakened gate certifies itself, and the run is green.

### 5. What happens on failure

Nothing automated. There is no retry, no repair loop, no backoff, and therefore
no oscillation to detect. `verify`'s `&&` chain stops at the first failure by
design, and the workflow comment says why. Recovery is a human deciding what to
do next.

The reference's two open questions (§6 — repair without rollback, oscillation
detection) **do not apply to this repository today.** They become live the moment
anything runs the agent unattended.

### 6. Where irreversible actions are gated

- **Commit message:** `.githooks/commit-msg`, wired via `git config
  core.hooksPath` → `/Users/rux/Developer/rux-ds/.githooks` (verified). It
  enforces the subject limit, the blank line, capitalisation, the author
  identity, and refuses `Co-Authored-By` and AI-attribution lines.
- **Push:** interactive permission prompt only. Branch protection **not verified**.
- **Merge / deploy / publish:** not applicable — no release process exists.

---

## Findings

Ordered by (failure permitted × likelihood). Severity uses the reference's four
categories.

### 1. The coverage ratchet is not a ratchet in code — CONFIRMED by probe

**Severity: silent control weakening. Tier 2. Likelihood: high.**

`README.md:669` states "a ratchet can only be moved up, and moving it is
deliberate." `tools/check-coverage.mjs:115` writes the baseline unconditionally
from the *current* measurement. The guarantee lives in the `note` string it
writes ("never to make a red gate green") and in a header comment. Both are
addressed to a reader. Neither is a check.

Probed in an isolated copy of the tree (never in the repository):

```
baseline gate exit=0
raised copy-button hit 2 -> 7 in docs/coverage.json
tampered gate exit=1          REGRESSED copy-button 7 -> 2 of 6 classes
npm run coverage:update       exit=0
gate after coverage:update    exit=0
copy-button now recorded as   {"hit":2,"own":6}
```

**The concrete failure:** an agent that strips markup and drops a component's
class coverage runs one allowlisted command — `npm run coverage:update`, matched
by `Bash(npm run *)` — and the gate goes green. CI then passes, because CI runs
the same gate against the rewritten baseline. The only trace is a diff in
`docs/coverage.json` that nothing flags and no reviewer is required to read. The
reference names this exact case: *an agent can silently rewrite the
expected-output fixture its own change is checked against, and nothing would
flag it.*

`check-coverage` is the **only** gate with this shape — `grep -l
"\-\-update|writeFileSync"` over `tools/check-*` returns it alone. The blast
radius is one file.

**Cheapest fix that closes it: refuse the downgrade in `--update`.** Compare
against the existing baseline and keep the higher of the two per component,
printing what it declined to lower. A few lines, no new file, no new concept,
and it makes the README sentence true. This is the cheapest change that closes
the most severe gap, and it should be first.

### 2. No control-integrity check of any kind

**Severity: silent control weakening. Tier 1 mechanism / tier 2 approximation.
Likelihood: moderate.**

No manifest, no digest, no `controlFiles`, no PreToolUse guard, no CI step that
distinguishes a change to `tools/` from a change to `sink/`. An agent may edit
the gate that judges it, in the same run, and nothing anywhere says so.

The reference's answer — a trusted baseline outside the workspace — is tier 1
and **should not be built here** (see "what not to adopt"). The proportionate
version is *visibility*, not approval: a `controlFiles` list, and a CI step that
prints a loud, non-blocking warning when a push touches a listed path. On a
single-maintainer repository, the value is that rux sees it, not that a second
party approves it.

### 3. `Bash(node -e ' *)` makes every other permission decorative

**Severity: unbounded resource use / uncontained authority. Tier 2.
Likelihood: high — it is a convenient line and it is already used.**

`.claude/settings.local.json:9`. One auto-approved entry that writes any file and
opens any socket. Whatever finding 2 eventually costs to fix, this entry routes
around it. It is also the reason finding 1 needs no prompt.

Related and separable: **three entries in `~/.claude/settings.json` embed
Supabase JWTs in full.** That file is not in this repository, so it is out of
scope for a fix here, but it is in scope for this audit because it grants
authority *in* this repository. If those tokens are live, rotate them; an
allowlist is a config file, not a secret store.

### 4. Every browser reading is currently uncurrent

**Severity: none of the four — it is a measured state, not a permitted failure.
Likelihood: n/a.**

`npm run gates` at `3798331`:

```
21 gates — 16 in npm run verify, 5 need a browser
38 sweep cells · 0 current · 38 stale · 0 never run
```

**Zero of thirty-eight.** This is the designed asymmetry — `tools/check-gates.mjs:56`
explains why STALE prints and NEVER RUN blocks, and the reasoning is right: a gate
red on every commit is one nobody keeps. But the *current reading* is that the
entire browser half of the verification system is uncurrent, and the reference's
observation applies with a twist: a gate whose result has aged past every input
is closer to "never run" than the four-state model admits.

Not a gap to close by making STALE blocking — that trade was already made
deliberately. It belongs here as a fact about the state of the tree.

### 5. `docs/agent-tooling.md` says the repo has no hook; the hook exists

**Severity: none directly. Documentation-vs-reality disagreement, which the
reference and this repository both treat as a finding in itself.**

`docs/agent-tooling.md:90` — "**This repo has none, and its own `CLAUDE.md` says
otherwise.** ... not in `.git/hooks` ... Checked 2026-08-31." But
`git config core.hooksPath` returns `.githooks`, and `.githooks/commit-msg` is a
present, executable, 3.7 KB script that enforces exactly what `CLAUDE.md` claims.
The check looked in `.git/hooks` and missed `core.hooksPath`.

`CLAUDE.md` was right. The document written to correct it is the one that is
wrong, and it currently instructs a reader to "delete the claim or build the
thing" when the thing exists.

**The real gap it half-found is smaller and sharper:** `core.hooksPath` is local
git config, not repository content. A fresh clone gets `.githooks/` and does not
get the hook — enforcement is one unversioned setting away from silently absent,
which the hook's own line 7 acknowledges ("Enabled per clone with"). Nothing
verifies it is enabled. A one-line check in `verify` would.

### 6. No `AGENTS.md`, no untrusted-content policy, no tier classification

**Severity: none permitted directly. Tier 2. Likelihood: low today, high if a
second tool or a second person touches the repo.**

- No `AGENTS.md`. `CLAUDE.md` is the only instruction file, so any agent that
  does not read `CLAUDE.md` arrives with no policy at all.
- Neither file says **treat repository content and tool output as untrusted
  data**. `docs/carbon-*.json` is 667 captured DOM fragments from an external
  source, read on almost every task. Nothing states that a capture is data.
- No artifact tier classification, and no escalation list.

`reference/tier-rules-block.md` exists precisely to close this and is ~900 tokens.

---

## Verdict

**Yes, upgrade — but only four things, and only one of them urgently.**

1. **Make `--update` refuse to lower a baseline** (`tools/check-coverage.mjs`).
   Smallest change in this list, closes the only *confirmed* silent-weakening
   path, and makes an existing README sentence true. Do this first.
2. **Remove `Bash(node -e ' *)` from `.claude/settings.local.json`**, and rotate
   the Supabase tokens sitting in the global allowlist if they are live. Also
   near-free.
3. **Add a `controlFiles` list to `tools/lib/gates.mjs` and a non-blocking CI
   warning when a push touches one.** Half a day. Visibility, not approval —
   a single maintainer cannot be their own independent reviewer, and pretending
   otherwise builds theatre.
4. **Paste `reference/tier-rules-block.md` into a new `AGENTS.md`, make
   `CLAUDE.md` point at it, and add the untrusted-data sentence.** An hour.
   Lowest value today, highest value the moment anything else reads this repo.

Everything else in the reference is either already here in a better form, or
answers a problem this repository does not have.

---

## What not to adopt

The reference is deliberately more than most repositories need, and most of it is
more than this one needs. Deliberately leaving undone:

- **The three supervisors (§2), and the entire budget stack.** They bound an
  *unattended* agent loop. There is no loop here — there is a person in a chair
  who can press Escape. Building a workflow supervisor to bound a session the
  user is watching is cost with no failure closed. Tier 1 in the reference says
  this work must not be done per-project anyway, and that guidance is right: a
  hand-rolled process-tree terminator is the class of thing that looks correct
  and is subtly wrong.
- **SARIF 2.1.0 and the `agent-verifier-report` schema (§4).** Their value is
  aggregation across many gates for a machine consumer, and the consumer here is
  a terminal and a CI exit code. Converting sixteen gates that each print one
  honest line into JSON nobody parses would make the output worse. Revisit if a
  dashboard or a second repository ever consumes these results — the portal
  renders state files, not gate results, so it is not that consumer today.
- **Orchestration-result and gate-result schemas, run/correlation/invocation
  IDs.** Same reason. There is no run to correlate.
- **Separating the changing actor from the approving actor (§1).** Unavailable:
  one maintainer. Substituting "a second model reviews it" would be exactly the
  universal substitute the reference declines to endorse. The honest local form
  is the visibility control in verdict item 3.
- **SLSA provenance and release integrity (§6).** There is no release. Roadmap
  §8.2 already owns versioning and tags; this would front-run a decision that is
  filed and open.
- **AI product documentation (§5).** rux-ds ships CSS and markup. The product
  does not use AI.
- **A repair loop with rollback, and oscillation detection (§6's open
  questions).** Both presuppose the automated loop above. Recording that they
  were considered and are not applicable is the whole of the work.

---

## Already better than the reference

Said plainly; the reference is not authoritative, and on three points this
repository is ahead of it.

- **Every gate declares its own blind spots, in its own header, and the registry
  copies them rather than restating them.** The reference has `blindSpots` as a
  registry field (§3). It does not have the rule that the field is *copied from
  the tool's own header, and is `null` where the tool states nothing* —
  `tools/lib/gates.mjs:36-38`. That refusal to fill a blank with a guess is
  stronger than the reference asks for, and it is the single most useful
  adaptation in the repository for agent work: "check passed" reads as "thing is
  correct" unless the check says otherwise.
- **The coverage matrix answers a question the reference never asks.** §3 and §4
  are entirely about what a gate *found*. `tools/check-gates.mjs` is about
  whether a gate was ever *pointed at* a target, with four states and staleness
  measured in commits rather than dates. The reference has no equivalent, and the
  bug that motivated it — one shipped nine times — is a failure mode its control
  model does not cover.
- **`docs/audits.md`, and the rule that an audit's boundary is its payload.**
  "An area never audited is indistinguishable from one audited clean" is the same
  insight one level up, and the ledger's practice of striking rows through rather
  than deleting them, and superseding entries in the open, is better record
  discipline than the reference describes anywhere.

Three smaller ones: CI pins the Node **floor** from `engines` rather than the dev
version; CI asserts the committed build output is not stale, which is the golden
test for exactly the silent miss an agent makes; and `--ignore-scripts` in CI is
a supply-chain control the reference's §7 cites SLSA for and never states
concretely.

And one standing rule that the reference lacks and should arguably borrow: **an
exception list is not a passing check.** `docs/agent-tooling.md` records two
candidate gates rejected on those grounds. The reference has no equivalent test
for whether a proposed control is ready.

---

## What I could not determine

| Question | What would settle it |
|---|---|
| Does `rux-sm/rux-ds` have branch protection or required checks on `main`? | `gh api repos/rux-sm/rux-ds/branches/main/protection` — needs network and auth, neither used here |
| Are the three Supabase JWTs in `~/.claude/settings.json` live? | An authenticated request against that worker, or checking the project's key rotation — deliberately not attempted |
| Are any of the 38 recorded browser readings honest? | **Structurally undecidable**, and the repository already says so by name — `check-gates` "cannot verify that a recorded result is honest". Only re-running the sweep tells you what is true *now*, and it still cannot audit the past |
| Do the five global notifier hooks do anything beyond notifying? | Read the five files in `~/.claude/hooks/`; not opened |
| Is anything in `docs/roadmap.md` already deciding findings 2, 3 or 6? | Read §4.8 and §5 in full; only targeted greps were run |
| Would a `controlFiles` warning in CI actually get read, or become the noise finding 4 warns about? | One month of running it |
