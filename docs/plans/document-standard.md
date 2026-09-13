---
type: plan
---

# Plan: one document standard for the site and atlas

## Goal

Both repositories follow the same document rules, and checks enforce them, so
documents stay small and current without anyone remembering to tidy them.

## Decisions

- **Six kinds of document:** readme, rules, status, how-to, reference, plan.
  `README.md`, `AGENTS.md`, `CLAUDE.md` and `docs/status.md` are known by their
  names. Every other document says its kind in a `type:` header line. Atlas
  content keeps its own types.
- **No orphans.** Every project document is linked from a README in its
  folder or a parent folder, or from a generated index. Atlas content is
  exempt.
- **Every file a document names exists.** The site gets the check atlas has.
  Plans are skipped, because they name files that do not exist yet. Paths into
  atlas are checked only when atlas sits beside the site, and the check says
  when it could not look.
- **Limits.** A README fails over 150 lines. Any other document warns over 300.
- **Short open work.** A site status item is one bullet of at most three lines.
  Atlas keeps its one-line issues table, because its content cites issue ids.
- **Open work stays in files,** not GitHub Issues.
- **Plans.** Work that spans more than one session gets a plan first, in the
  repository's `docs/plans/`, one file per piece of work. A plan has four
  parts: goal, decisions, questions and tasks. rux answers the questions and
  says go before building starts. A plan changes like any other document:
  decisions get corrected, found work gets added, and answered questions and
  finished tasks get deleted. It never records when something was done. The
  plan is deleted with its last task.
- **Where a plan goes.** Site work goes in the site's plans folder, even when
  it touches atlas. Atlas-only work goes in atlas's, because atlas is private.
- **Plan checks.** A plan lives only in a plans folder and has all four parts.
  A ticked box or a plan with no tasks fails, because finished work is deleted. A plan untouched for 30 days warns, read
  from git. The status list does not name plans; the folder is the list.
- **Only testable rules get checks.** Kinds, orphans, named files, lengths,
  status item length and plan shape are checked. One home per fact,
  one-sentence reasons and corrections that replace the wrong sentence stay
  principles.
- **History phrases warn** outside atlas content, such as "corrected on" or
  "until 2026".
- **Code and its document change in the same commit.**
- **Lowercase file names** for names people choose. A name a tool or a
  convention fixes stays as it expects: `README.md`, `AGENTS.md`, `CLAUDE.md`,
  `LICENSE`, `NOTICE`, `SKILL.md`, the design system's `ORDER` and Notes'
  `PIN`. Atlas content ids are covered by the naming plan.
- **Data is not documentation.** The design system's JSON capture files move
  out of its docs folder into `rux-ds/data/`.
- **No review-by-another-session rule.** Atlas's self-test and rux's plan
  review are the checks. A fresh session stays available as a tool.
- **The Claude settings folder** follows the standard by habit, with no check.

## Questions

None.

## Tasks

### Site

- [ ] Rewrite the Documents section of `AGENTS.md` with these decisions.
- [ ] Move the naming plan and the PO and invoice lists plan into
      `docs/plans/`, reshape both into the four parts, fix every link to them,
      and drop plan lines from `docs/status.md`.
- [ ] Add a `type:` line to every site document that is not known by its name.
- [ ] Build `tools/check-docs.mjs` and run it from `npm run check`: kinds,
      orphans, named files outside plans with atlas paths checked only when
      atlas is present, lengths, status item length, plan shape and place,
      ticked or empty plans, stale plans as a local-only warning, and history
      phrases as a warning.
- [ ] Fix everything the new check reports.
- [ ] Move the design system's JSON data files to `rux-ds/data/` and update
      every tool and document that reads them.
- [ ] Build, run the full check, commit and push.

### Atlas

- [ ] Remove the rule that a control change is judged by another session.
- [ ] Add the testable document rules to `AGENTS.md`, each naming its check,
      and keep the rest in principle 10.
- [ ] Rename `docs/HANDOFF.md` to `docs/handoff.md`, `docs/START-HERE.md` to
      `docs/start-here.md`, `_standards/` to `standards/`, its template file to
      lowercase, and `_inbox/` to `inbox/`. Fix every reference in both
      repositories. If a file in `evidence/` names an old path, stop and ask,
      because evidence never changes.
- [ ] Give atlas's project documents their kind, extending the frontmatter
      schema where it needs the new kinds.
- [ ] Extend `tools/check.py` with a `docs` check matching the site's, with
      fixtures in `tools/selftest.py`.
- [ ] Run the check and the self-test, fix what they report, commit and push.
- [ ] If published text changed, run the export in the site, commit and push.

### Claude settings

- [ ] Add plans to the documents rule in `CLAUDE.md`: reviewed before
      building, kept in `docs/plans/`, deleted when done.

### Finish

- [ ] Delete this plan with its last task.
