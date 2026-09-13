# Adoption Audit Prompt

Hand this to an agent pointed at an existing repository to find out whether its
agent tooling is worth upgrading, and what to do first. It produces a gap
report, not a patch.

Conforming to the reference is not the goal. The reference is an architecture to
adapt, and a system can be adequate — or better — while diverging from it. An
audit that recommends adopting everything has not audited anything.

---

## Prompt

```
Audit this repository's AI-agent tooling against the reference architecture in
<PATH TO agent-self-correction-loop.md>. Produce a gap report. Change nothing.

Read the reference first, in full.

SCOPE: audit only. Do not implement, patch, stub, or "demonstrate" any gap you
find, including in a scratch directory. Do not modify gates, tests, fixtures,
expected results, CI configuration, or permissions. If a fix seems obvious and
small, still only describe it.

EVIDENCE RULES. This audit is worthless if it reports impressions.
- Cite a file path and line for every claim about what the system does.
- Run the verification commands the repository actually documents, and report
  their real output, including failures.
- Where you could not check something — no credentials, no sandbox, a command
  that would mutate state — say "not verified" and why. An honest gap in the
  audit is more useful than an assumed answer.
- Distinguish what the repository DOES from what its documentation CLAIMS. Where
  they disagree, that disagreement is itself a finding.

INVENTORY. Establish what exists today:
1. How agents are invoked, and what bounds them — time, tokens, cost, tool
   calls, network, changed files, diff size. Which of these are enforced by
   something outside the model, and which are only instructions to it?
2. What isolation exists. Is there a sandbox? What is writable, what is
   reachable on the network, which credentials are in the environment? How are
   child processes terminated, and does anything guarantee the whole process
   tree stopped?
3. What verification runs, what format it emits, and who consumes it.
4. Which files are treated as controls — gates, fixtures, expected results, CI
   config, permissions, allowlists — and what stops an agent from editing the
   thing that judges it.
5. What happens on failure: retries, repair loops, and whether anything bounds
   or detects oscillation.
6. Where irreversible actions (merge, deploy, publish) are gated, and by whom.

COMPARE. For each of the six areas, report:
- what the reference asks for;
- what exists here, with evidence;
- the gap, and the concrete failure it permits — not "does not follow the
  reference" but "an agent can silently rewrite the expected-output fixture its
  own change is checked against, and nothing would flag it";
- severity: whether it permits silent control weakening, unbounded resource
  use, uncontained processes, or an unauthorized irreversible action;
- tier, per the reference's classification: tier 1 gaps are shared platform work
  and must not be closed per-project by an agent; tier 2 gaps are configuration
  an agent may draft for review.

VERDICT. Answer directly: should this system be upgraded, and what first?
Order recommendations by (failure permitted × likelihood), not by ease. State
the cheapest change that closes the most severe gap.

Include three sections that are easy to skip and are the most useful:
- WHAT NOT TO ADOPT: parts of the reference that are wrong for this repository —
  the budgets are illustrative, the risk tier may not warrant a full supervisor
  stack, and a small internal tool does not need what a deployment pipeline
  does. Say what you would deliberately leave undone, and why.
- ALREADY BETTER: anything this system does that the reference does not cover or
  handles worse. Say so plainly; the reference is not authoritative.
- WHAT I COULD NOT DETERMINE: open questions a human has to answer, and what
  evidence would settle each one.

Write the report to `docs/adoption-audit.md` in the repository root. Do not create
any other file.
```

---

## Reading the result

Two failure modes to watch for in the report you get back.

**Recommends adopting everything.** The reference is deliberately more than most
repositories need. A report with an empty "what not to adopt" section did not
weigh cost against risk, and its ordering is probably alphabetical in disguise.

**Severity tracks effort.** If every severe gap happens to be a large project and
every small gap is minor, the auditor is likely rationalizing toward a
comfortable plan. Real audits surface at least one cheap fix for a serious gap.

Check two or three cited line numbers yourself before acting on the report. An
audit is a claim about a system, and claims about systems are checkable.
