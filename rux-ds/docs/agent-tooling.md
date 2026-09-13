# The maintenance instruments — what each one is, and when to reach for it

This is a reference for the *kinds* of instrument this repo runs, not for any
one of them. `tools/lib/gates.mjs` is the registry of the gates themselves;
this document is the layer above it — what a gate IS, what it is not, and what
the other four instruments do that a gate cannot.

## Why this document exists

In an ordinary project, documentation DESCRIBES the work. In a project worked
on by an agent, documentation IS PROGRAM STATE: it is read on every run by
something with no memory of yesterday and no way to notice that a sentence has
aged. A stale line is not untidiness. It is a corrupted variable.

The header of `tools/lib/gates.mjs` proves it. That comment says there are 14
gates, 10 in `npm run verify` and 4 in a browser. Run the registry it sits on
top of and the answer is 21, 16 and 5. The prose describing the state file went
stale while the state file stayed correct — which is the whole argument for
having a state file at all.

## The six instruments

| | answers | fails when | costs |
|---|---|---|---|
| **Gate** | "is this artefact still well-formed?" | an invariant breaks | seconds per run |
| **Hook** | nothing — it makes a gate unskippable | the gate it wraps fails | patience, if slow or noisy |
| **Test** | "does this code do the right thing on known input?" | behaviour changes | maintenance of fixtures |
| **Pin** | "how far has upstream moved since we looked?" | drift becomes visible | one file, updated by hand |
| **State file** | "what is true right now?" | prose disagrees with it | a generator script |
| **CI** | "does it still pass where nobody can skip it?" | any of the above fails | minutes per push |

They are not interchangeable and they fail in different directions. Adding a
gate when the problem was stale prose buys nothing.

---

## 1. Gates

**Also called:** linter, static analysis, policy-as-code, invariant check.
Elsewhere: ESLint, Semgrep, OPA, `terraform validate`.

**What it is.** A program that answers ONE question about an artefact on disk
and exits non-zero when the answer is wrong. `check-classes.mjs` asks whether
every `rux--*` in the markup resolves to compiled CSS. That is all it asks.

**When to add one.** When a defect could recur silently, and the question that
would have caught it can be answered mechanically from files in the repo. Both
halves matter. A defect that announces itself does not need a gate; a question
that needs a human eye cannot have one.

**When NOT to add one.**

- **If it needs a growing allow-list, it is not ready.** A rule you can only
  express as "everything except these 40 cases" is measuring the 40 cases. Under
  an agent this is worse than useless: adding an entry is the cheapest route to
  green, and the agent will take it and report success.
- **If the check would be half a check.** `check-ancestry` is the standing
  example — a local version would need DOM captures this repo deliberately does
  not vendor, and a half-version reads as coverage nobody has.

**The rule that matters most here.** *A gate must declare its own blind spots.*
Every tool in `tools/` names, in its own header, what it cannot see. This is
unusual — ESLint does not do it — and it is the single highest-value adaptation
for agent work, because "check passed" reads as "thing is correct" to a model
unless the check says otherwise. `blindTo` and `blindSpots` in the registry are
copied from those headers, and where a tool states nothing the value is `null`
rather than a guess.

**The second rule.** *A gate never run against a target is indistinguishable
from a gate that passed.* This cost nine instances of one bug: `check-a11y`
already carried the rule, and had never been pointed at `templates/`. Hence
`npm run gates` and its coverage matrix, which is itself a gate in `verify`.

**Where they live here.** `tools/check-*.mjs` (Node, read files, run in
`verify`) and `tools/check-*.js` (browser, run against a served page). 21 total;
16 in `verify`, 5 needing a browser. Check `verify`'s **exit code** — a pipe
returns the last command's status and has already reported a pass over a
failure.

---

## 2. Hooks

**Also called:** pre-commit hook, git hook. Elsewhere: `husky`, `pre-commit`,
`lefthook`.

**What it is.** Not a check. A *delivery mechanism* that makes a check
unskippable at a moment when skipping is tempting.

**This repo has one: `.githooks/commit-msg`, armed per clone with
`git config core.hooksPath .githooks`.** This section said the opposite until
2026-09-01 — that no hook existed and `CLAUDE.md`'s claim was a corrupted
variable — and by then the hook had existed for days. The paragraph describing
the corruption was itself the stale line, which is the failure mode this
document warns about, arriving from inside it. `docs/adoption-audit.md` finding 5
recorded the contradiction; nobody corrected the sentence.

**When to add one.** When a defect could recur silently, and the question that
would have caught it can be answered mechanically from files in the repo. Both
halves matter. A defect that announces itself does not need a gate; a question
that needs a human eye cannot have one.

**When NOT to add one.**

- **If it needs a growing allow-list, it is not ready.** A rule you can only
  express as "everything except these 40 cases" is measuring the 40 cases. Under
  an agent this is worse than useless: adding an entry is the cheapest route to
  green, and the agent will take it and report success.
- **If the check would be half a check.** `check-ancestry` is the standing
  example — a local version would need DOM captures this repo deliberately does
  not vendor, and a half-version reads as coverage nobody has.

**The rule that matters most here.** *A gate must declare its own blind spots.*
Every tool in `tools/` names, in its own header, what it cannot see. This is
unusual — ESLint does not do it — and it is the single highest-value adaptation
for agent work, because "check passed" reads as "thing is correct" to a model
unless the check says otherwise. `blindTo` and `blindSpots` in the registry are
copied from those headers, and where a tool states nothing the value is `null`
rather than a guess.

**The second rule.** *A gate never run against a target is indistinguishable
from a gate that passed.* This cost nine instances of one bug: `check-a11y`
already carried the rule, and had never been pointed at `templates/`. Hence
`npm run gates` and its coverage matrix, which is itself a gate in `verify`.

**Where they live here.** `tools/check-*.mjs` (Node, read files, run in
`verify`) and `tools/check-*.js` (browser, run against a served page). 21 total;
16 in `verify`, 5 needing a browser. Check `verify`'s **exit code** — a pipe
returns the last command's status and has already reported a pass over a
failure.

---

## 2. Hooks

**Also called:** pre-commit hook, git hook. Elsewhere: `husky`, `pre-commit`,
`lefthook`.

**What it is.** Not a check. A *delivery mechanism* that makes a check
unskippable at a moment when skipping is tempting.

**This repo has none, and its own `CLAUDE.md` says otherwise.** That file
describes `docs/commits.md` as "enforced by a hook". There is no such hook: not
in `.git/hooks`, not in `.claude/settings.json`, not in
`.claude/settings.local.json`, not in the global settings. Checked 2026-08-31.
The commit format is enforced by nothing but whoever is typing, which is the
second corrupted variable found while writing this document — and the more
dangerous one, because a claimed guard is trusted like a real one.

**When to add one.** When the thing being guarded is unrecoverable or expensive
to undo — a bad commit message is in history forever — AND the check is fast.

**When NOT to.** Everything else. The constraint is social, not technical: a
hook that is slow or fires falsely gets bypassed, and once someone learns the
bypass, every hook loses its force. Each additional hook spends the same finite
budget of patience. One hook that always matters beats five that mostly do not.

**Rule of thumb.** Under ~200ms and a false-positive rate near zero, or do not
ship it.

**The one worth having here is the one that exists**: subject ≤50 chars,
body wrapped at 72, no AI attribution, identity checked. A bad commit message
is unrecoverable without a rewrite of history, which is the exact profile that
earns a hook, and it runs in well under 200ms. The same script is copied into
`rux-ln-atlas` and `rux-ln-notes`, so the family has one commit rule.

---

## 3. Tests

**Also called:** unit tests, snapshot/golden tests, property tests, conservation
checks.

**What it is.** Where a gate checks an invariant over an artefact, a test checks
the BEHAVIOUR of code against known input. Different question, different failure.

**Why this repo has none, honestly.** There is no code here that runs and
produces a result — the tools are gates, and the output is markup. That is a
fact about the project, not a gap to apologise for. It changes the moment
anything renders or transforms data.

**The two kinds that will matter first, when that day comes:**

- **Conservation tests.** Count what goes in, count what comes out, fail on any
  category producing zero. This is the direct countermeasure to the signature
  failure of agent-written code: SILENT OMISSION. An agent implementing a filter
  handles the cases it thought of and drops the rest without erroring — nothing
  throws, output looks plausible, and the loss is invisible until someone counts.
- **Golden / snapshot tests.** Commit the rendered output; a refactor diffs
  against it. This is the mechanised form of the standing rule that *where a
  change is meant to be invisible, you prove it*. Without a snapshot, "nothing
  moved" is an explanation of why nothing should have moved — a hypothesis
  wearing a result's clothes.

---

## 4. Pins

**Also called:** lockfile, vendoring, provenance record. Elsewhere:
`package-lock.json`, `go.sum`, a vendored SDK version.

**What it is.** A committed record of the exact upstream state a claim was made
against, so that drift becomes VISIBLE rather than silent. `docs/carbon-*.json`
is the large form: 667 captured Carbon stories that match the compiled Carbon
version, need no network, and can be diffed mechanically by
`tools/diff-fragment.mjs`.

**When to add one.** Whenever correctness depends on something outside the
repo — a library's DOM, an API's shape, another repo's contents. Without a pin,
"we match upstream" degrades into "we matched upstream at some unrecorded past
moment", and nothing anywhere says which.

**The failure mode.** A pin that nothing compares against is a comment. The pin
must be paired with something that reads it — a gate, or at minimum a documented
command.

**Related, and stricter:** a `BEHAVIOUR:` comment on a template is a pin on a
*running page* — the URL, the date, the properties compared, and what was NOT
covered. `check-provenance` enforces its presence. It exists because four
confident claims about the UI shell were derived from `css/rux.css` in one
sitting and all four were wrong; the stylesheet records mechanism and says
nothing about intent. `docs/verifying-templates.md` is the procedure.

---

## 5. The state file

**Also called:** generated manifest, single source of truth, machine-readable
inventory.

**What it is.** One small generated file holding the volatile facts — counts,
lists, ratios — regenerated by a script, committed so `git diff` shows it
moving, and cited by prose instead of restated in it.

**This is the instrument that catches what the other four cannot.** Every piece
of rot found in this repo has been volatile state written as prose: "seventeen
gates", "six templates", "enforced by a hook". Prose is where an agent looks and
prose is what nothing can check.

**Where it already works here.** `docs/gate-coverage.json`, `docs/inventory.json`
and `docs/coverage.json` are exactly this, and the gates that read them are why
those numbers do not rot. Where it does NOT yet work is the surrounding prose:
`tools/lib/gates.mjs`'s own header is the counterexample at the top of this
document.

**The rule.** *Generate state, never prose.* An argument — "a draft is labelled
on the page, not withheld from it" — is the valuable part of a document and no
generator can write it. A count is not. Split them, put the count in JSON, and
have the prose point at it.

---

## 6. CI

**Also called:** continuous integration, the pipeline. Here:
`.github/workflows/gates.yml`.

**What it is.** The same gates, run somewhere nobody can skip them. A hook can
be bypassed with `--no-verify` and a local run can be forgotten; a push cannot
avoid CI. That is its only real advantage, and it is enough.

**When it earns its place.** The moment the repo is pushed anywhere — which this
one is, to `rux-sm/rux-ds`. It stops mattering less as a project gets smaller;
it stops mattering when nothing leaves your disk.

**Two things this workflow does that are worth copying:**

- **It pins the Node floor, not the dev version.** `node-version: '22'` is the
  bound declared in `package.json` engines, while development happens on 26.x.
  CI proving the floor is honest is something local runs structurally cannot do.
- **It checks the committed build output is not stale.** `verify` writes
  `css/rux.css`, `kitchen-sink.html` and `portal.html`; a dirty tree afterwards
  means someone edited a source and shipped the old artefact. This is the CI form
  of a golden test, and it is the one check that catches an agent editing SCSS
  and forgetting the generated file — a silent, entirely plausible-looking miss.

**The one list it deliberately does not keep.** The gates are named once, in
`package.json`'s `verify` script, and CI just runs it. A second list in the
workflow file would be a second thing to drift.

---

## Two traps specific to working with an agent

**An agent optimises for the check turning green, not for the invariant
holding.** Design every check so that satisfying it honestly is cheaper than
gaming it. Where that is impossible, the check is not ready — record what the
attempt learned and leave the rule unenforced.

**A decision with no recorded rejected alternative looks OPEN.** An agent will
reopen it, in good faith, every session, for free. Roadmap §1.1, §2.1, §4.4 and
§4.6 record choices *with what was rejected and why*, and README's "Open decisions"
section is the inverse — an explicit list of what must not be settled quietly.
Those two sections do more to keep an agent on course than any gate here.

## What this document does not cover

- **The individual gates.** Which one catches what is README's gate table and
  `tools/lib/gates.mjs`. This page is about the kinds, not the instances.
- **The one thing no instrument here does.** The screen-reader announcement
  pass: `docs/screen-reader-pass.md`. Five defects have shipped past every gate
  in this repo — two wrong base glyphs, a missing positioning wrapper, a missing
  styled wrapper, four `visibility: hidden` specimens. **Looking is not
  optional, and no instrument on this page replaces it.**
