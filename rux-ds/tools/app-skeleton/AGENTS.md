---
type: app
---

# AGENTS.md — the policy

The one instruction file; `CLAUDE.md` imports it. `README.md`, if there is
one, is the long version.

## What this repository is

**Public.** @TITLE@, one app on rux-ds, served at `rux-sm.github.io@PATH@`.
Started by rux-ds `tools/new-project.sh`. It vendors no copy of rux-ds: its
pages link `/rux-ds/…` on the shared origin, and what is live there is
rux-ds's newest release tag (rux-ds roadmap §8.4). Nothing from a client, a
person or a private repository appears in it.

## What is yours and what is not

- **Yours:** the pages at the root, `rux-theme.css` and `rux-overrides.css`
  (deltas only — empty is the normal state), `brand/`, `tools/`, this file.
- **rux-ds's:** everything under `/rux-ds/`, served from its own repository
  and never copied here. A missing component or rule is a request to rux-ds
  with invented content, never a local rule.
- Every `rux--*` class comes from rux-ds's `css/rux.css`. A colour goes in
  `rux-theme.css` inside a `[data-theme]` block; a component rule in
  `rux-overrides.css` at Carbon's own specificity; never `!important`.
- The app list is the hub's `switcher.json`, and `/switcher.js` fills the
  panel at runtime. Nothing here lists apps.

## The one check

    node tools/check.mjs

rux-ds's shared check, imported from the rux-ds checkout beside this
repository (`../rux-ds`, or `DS=<dir>`): classes, tokens, local references,
ids. Locally that is rux-ds on `main`; the Pages workflow checks rux-ds out
at its newest tag — what is live at `/rux-ds/` — and the site deploys only
when the check passes there. A class added on `main` passes locally and
fails in CI until it is tagged; that is the right failure. It cannot see
whether the page looks right: serve it (`node tools/serve.mjs`, every site
on one origin at :8640, this app at `@PATH@`), open it, in every theme.

## Which rux-ds this app is on

The one that is live. There is no pin to move: a rux-ds release reaches this
site on its next deploy, and `CHANGES.md` in rux-ds names any class that
left between two tags. `rux-ds` cloned beside this repository is required
to check or serve it.

## Commits

`type(scope): Subject`, subject ≤50 chars, body wrapped at 72 bytes, authored
by rux alone with no AI attribution. `.githooks/commit-msg` refuses anything
else; arm it once per clone: `git config core.hooksPath .githooks`.
