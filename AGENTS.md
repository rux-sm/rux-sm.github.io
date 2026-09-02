# AGENTS.md — the policy

The one instruction file; `CLAUDE.md` imports it. `README.md` is the long
version.

## What this repository is

**Public, and the root of the account.** It publishes at rux-sm.github.io, so
every other project site already sits under it by path. It is Rux Apps:
the front door to every app built on rux-ds, and the design system shown
working. It hosts nothing else. A module is its own repository and its own
folder, started by rux-ds's `tools/new-project.sh`, pinned to a tag, with its
own gates and its own publish. Nothing is shared by path.

## The two things every app shares

- **The design system, by pin.** `vendor/rux-ds/` is written by
  `new-project.sh` and never edited; `PIN` names the tag.
- **The list of apps, by URL.** `switcher.json` here is the one list.
  Every app's shell links `/switcher.js`, which fetches it and fills Carbon's
  switcher panel, marking the app you are on. Adding a module is one entry
  here and nothing anywhere else.

The header and the switcher are therefore identical on every site by
construction. The side nav and the page are each app's own. **No frames**: a
module built on rux-ds renders its own shell, and wrapping it would show two.

## What must not be invented

Every `rux--*` class comes from `vendor/rux-ds/css/rux.css`; `tools/check.mjs`
fails on one that does not, and on a module list that does not parse or names
a path no site can have. A class the design system does not compile is a
request to rux-ds with invented content, never a local rule. Colours go in
`rux-theme.css`, component rules in `rux-overrides.css`, the same rule as
rux-ds's "Where a change goes".

## The one check

    node tools/check.mjs

The commit hook and the Pages workflow both run it; the site deploys only
when it passes.

## Commits

`type(scope): Subject`, subject ≤50 chars, body wrapped at 72 bytes, authored
by rux alone with no AI attribution. `.githooks/commit-msg` refuses anything
else; arm it once per clone: `git config core.hooksPath .githooks`.
