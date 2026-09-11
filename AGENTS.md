---
type: app
---

# AGENTS.md — the policy

The one instruction file; `CLAUDE.md` imports it. `README.md` is the long
version.

## What this repository is

**Public, and the root of the account.** It publishes at rux-sm.github.io, so
every other project site already sits under it by path. It is Rux Apps:
the front door to every app built on rux-ds, and the design system shown
working. It hosts nothing else. A module is its own repository and its own
folder, started by rux-ds's `tools/new-project.sh`, with its own gates and
its own publish. Since 2026-09-10 (rux-ds roadmap §8.4 step 5) it vendors no
copy of rux-ds: its pages link `/rux-ds/…` on the shared origin, and what is
live there is rux-ds's newest release tag.

## The two things every app shares
**The shared part of this is one document, not three.** `rux-ds/docs/consumer-policy.md`
is what every project on rux-ds agrees to — how it is linked rather than
vendored, what is yours and what is rux-ds's, where a colour and a component
rule go, the one check, and how to serve the family locally. Read it first;
what follows is only what is this repository's own. Added 2026-09-11.


- **The design system, live.** Every page links `/rux-ds/…`; there is no pin
  to move. `CHANGES.md` in rux-ds names any class that left between two tags.
- **The list of apps, by URL.** `switcher.json` here is the one list.
  Every app's shell links `/switcher.js`, which fetches it and fills Carbon's
  switcher panel, marking the app you are on. Adding a module is one entry
  here and nothing anywhere else.

The header and the switcher are therefore identical on every site by
construction. The side nav and the page are each app's own. **No frames**: a
module built on rux-ds renders its own shell, and wrapping it would show two.

## What must not be invented

Every `rux--*` class comes from rux-ds's `css/rux.css`; `tools/check.mjs`
fails on one that does not, and on a module list that does not parse or names
a path no site can have. A class the design system does not compile is a
request to rux-ds with invented content, never a local rule. Colours go in
`rux-theme.css`, component rules in `rux-overrides.css`, the same rule as
rux-ds's "Where a change goes".

## The one check

    node tools/check.mjs

**rux-ds's shared check first**, imported from the rux-ds checkout beside
this repository (`../rux-ds`, or `DS=<dir>`): classes, tokens, file
references and id references over every page, script and stylesheet.
Locally that is rux-ds on `main`; the Pages workflow checks rux-ds out at
its newest tag — what is live at `/rux-ds/` — and runs this with `DS` set.
**Then the one rule that is this repository's own**: `switcher.json` parses,
and every entry's path and icon are well formed. The commit hook and the
Pages workflow both run it; the site deploys only when it passes. `rux-ds`
cloned beside this repository is required to check or serve it.

**The shared check was wired up on 2026-09-09 and should have been at the
`v0.1.6` pin.** This file was forty lines of its own until then — a class loop
over four files named by hand, and no token check at all — while the shared
implementation sat vendored and unrun at every pin since, because a pin move
rewrites `vendor/` and deliberately leaves `tools/` alone. Nothing the old loop
did is lost; it read four files where the shared one reads every page.

## Commits

`type(scope): Subject`, subject ≤50 chars, body wrapped at 72 bytes, authored
by rux alone with no AI attribution. `.githooks/commit-msg` refuses anything
else; arm it once per clone: `git config core.hooksPath .githooks`.
