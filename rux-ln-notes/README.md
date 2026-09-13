# rux-ln-notes

**The public site for Infor LN scenario guides, meeting reviews and practice
exercises**, at [rux-sm.github.io/rux-ln-notes](https://rux-sm.github.io/rux-ln-notes/).
It renders; it does not author. `AGENTS.md` is the policy. This file says
what is published, where it comes from, how to preview it, how it deploys,
and what must never be edited by hand.

## What it publishes

Scenario guides, meeting reviews with their summaries, and practice
exercises, each a generated page under `guides/` with `index.html` as the
front. Every page ends with the atlas revision it was built from. A draft
guide is labelled on the page, never withheld. Nothing here is written by
hand: markup lives in `tools/build.mjs`, content arrives as data.

An exercise page is a worksheet: the answer spaces atlas marked are text
areas, a box column is a tick per row, the pass condition is a box, and a
question with a key can reveal it once something has been written. What a
learner types stays in their own browser, and the rail exports it as
Markdown for the report-back. `js/exercise.js` is the whole of that.

## Where it comes from

One upstream pulled by a script and pinned; one read live, no copy here:

| | from | by | pin |
|---|---|---|---|
| `data/guides/` | `rux-ln-atlas`, **private**, export tier only | `sh tools/sync-guides.sh` | `data/guides/PIN` — atlas commit, contract, and a sha256 of the bytes |
| `/rux-ds/…` | `../rux-ds`, the design system in this same repository | nothing to run; every page links it | none — the two release together on a push |

Since 2026-09-12 this folder and `../rux-ds` live in one repository,
`rux-sm.github.io`, and are checked, served and published together from its
root.

Atlas holds the knowledge — evidence, session help, screenshots of a licensed
environment — and none of it comes across. `emit.py` there writes the export
tier and refuses to write anything if a name, an issue id or an evidence path
survives; `tools/check-data.mjs` here refuses a `data/guides/` whose bytes do
not match the hash the sync recorded. The data contract is atlas's
`_standards/guide-json.md`, and `_standards/renderer-brief.md` §5 lists what
bites when rendering it; both are read, never re-implemented.

The internal tier, with gaps, issue ids and the concept pages, renders only
into the git-ignored `build/` by `sh tools/sync-internal.sh`, and is never
published.

## Preview locally

**Start here. This is the everyday loop**, and it reads atlas's working tree
rather than a commit — edit a Markdown file there, re-run, see it. It writes
only into the git-ignored `build/`, so nothing tracked moves and nothing is
published:

From the repository root, one level up:

```sh
npm run serve -- --private       # sync-internal.sh into build/, served on :8644, never published
```

**Stop that server before re-syncing** — `sync-internal.sh` opens with
`rm -rf` on the directory it serves.

**The public preview is the other one**, and it needs a committed, pushed
atlas because `sync-guides.sh` writes a `PIN` that another machine has to be
able to reproduce. Also from the root:

```sh
npm run export                   # sync-guides.sh from ../../rux-ln-atlas, then build and check
npm run serve                    # the whole site on :8640, this app at /rux-ln-notes/
npm run check                    # every gate here, plus the rest of the family
```

The names list that `check-publishable` reads comes from `../../rux-ln-atlas`,
cloned beside the repository (or `ATLAS=<dir>`). Atlas's `SETUP.md` covers
its own once-per-machine steps.

## How it deploys

A push to the repository's `main` is a publication: `.github/workflows/pages.yml`
at the root rebuilds, refuses stale committed pages, runs the full check, and
deploys only if it passes. CI cannot read atlas, so the names class of
`check-publishable` runs in the root pre-commit hook on a machine with the
atlas checkout, over the staged bytes.

## Never edited by hand

`data/guides/`, `guides/` and `index.html` are generated. The
next sync or build overwrites them, and the real fix belongs upstream — in
atlas for content, in rux-ds for a component, in `tools/build.mjs` for
markup. `rux-theme.css` and `rux-overrides.css` at the root are this
project's own override hooks, linked after rux-ds's own and empty by design;
a rule goes there only when this project, not rux-ds, has to change
something.

## Where the rest went

What is outstanding is `docs/status.md`. The decisions that bind — build-time
rendering with committed output, drafts labelled, reviews at export tier,
what never publishes — are in `AGENTS.md`. The long record of how each was
reached, with its measurements, is in this file's history: `git show
55c22fb:README.md` is the last version that carried it.
