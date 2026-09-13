---
type: app
---

# AGENTS.md — the policy

The one instruction file; `CLAUDE.md` imports it. `README.md` is the long
version. `docs/status.md` is what is unfinished, across every app.
`docs/platform-consolidation-plan.md` is where the family is going;
`docs/migration-start.md` is the state it started from.

## What this repository is

**Public, and the root of the account.** It publishes at rux-sm.github.io, so
every other project site sits under it by path. It is Rux Apps: the front
door to every app built on rux-ds, and the design system shown working. Its
pages link `/rux-ds/…` on the shared origin; what is live there is rux-ds's
newest release tag.

## One session

Since 2026-09-12 a task edits every folder it touches — this one, an app,
rux-ds, atlas, backend — in one session, after reading that folder's own
`AGENTS.md`. No memo, no request to another repository, no second session
or second authorization for the same task. What does not relax: atlas's
private material leaves only through its export; rux-ds is authored with
invented content; a database change is applied to production as its own
deliberate step.

## The two things every app shares

`rux-ds/docs/consumer-policy.md` is what every project on rux-ds agrees to.
What follows is this repository's own.

- **The design system, live.** Every page links `/rux-ds/…`; there is no pin.
- **The list of apps, by URL.** `switcher.json` here is the one list. Every
  app's shell links `/switcher.js`, which fetches it and fills the switcher,
  marking the app you are on. Adding an app is one entry here.

The header and the switcher are therefore identical on every site. The side
nav and the page are each app's own. **No frames**: an app renders its own
shell, and wrapping it would show two.

## What must not be invented

Every `rux--*` class comes from rux-ds's `css/rux.css`; `tools/check.mjs`
fails on one that does not, and on a module list that does not parse or names
a path no site can have. A class the design system does not compile is added
to rux-ds with invented content, never a local rule. Colours go in
`rux-theme.css`, component rules in `rux-overrides.css`.

## The one check

    node tools/check.mjs

rux-ds's shared check first, from the checkout beside this repository
(`../rux-ds`, or `DS=<dir>`): classes, tokens, file and id references, the
inlined sprite. Locally that is rux-ds on `main`; the Pages workflow checks
rux-ds out at its newest tag. Then this repository's own rule:
`switcher.json` parses and every entry is well formed. The commit hook and
the Pages workflow both run it; the site deploys only when it passes.
`rux-ds` cloned beside this repository is required to check or serve it.

## Commits

`type(scope): Subject`, subject ≤50 chars, body wrapped at 72 bytes, authored
by rux alone with no AI attribution. `.githooks/commit-msg` refuses anything
else; arm it once per clone: `git config core.hooksPath .githooks`.
