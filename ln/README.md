# LN Guide

**Infor LN tasks to follow, one step at a time**, at
[rux-sm.github.io/ln](https://rux-sm.github.io/ln/). LN Guide draws; it does
not author. The repository's `AGENTS.md` is the policy, and its `README.md`
covers setup, the commands and how a push deploys.

## What it is

One page, `index.html`, whose address says which screen shows:

- **Home** asks what you are doing: a search box, the place you stopped, and a
  card for each scenario.
- **A scenario** is a path of tasks, with each decision drawn as a fork.
- **A task** shows one step at a time, with what you should see.
- **A decision** is a screen of its own, each answer a button.
- **Map** shows a scenario's route, and the whole chain behind a button.
- **Search** finds problems, tasks, screens and ideas, and opens a card for
  each.

Where the reader stopped is kept in their browser and nowhere else.
`docs/plans/ln-guide.md` in the repository root is what it is for and what is
still to build.

## How the page is made

1. `sh tools/sync-export.sh` copies atlas's **export tier** into `data/atlas/`
   and writes `data/atlas/PIN`: the atlas commit, the contract and a sha256 of
   the bytes. `tools/check-data.mjs` refuses data that does not match it.
2. `tools/build-views.mjs` writes `index.html` from that data, and lists what
   the export does not yet say. `app.css` and `app.js` are its styles and
   behaviour, and `tools/shell.mjs` is the site header.

The data contract is atlas's `standards/export-json.md`. Every control on the
page is Design's, linked at `/design/`.

## Privacy

Atlas holds evidence, session help and screenshots of a licensed environment,
and none of it comes across. Atlas's `emit.py` refuses to write the export tier
if a name, an issue id or an evidence path survives. `check-publishable` sweeps
for names using atlas's list, from `../../atlas` or `ATLAS=<dir>`. CI
cannot read atlas, so that sweep runs in the pre-commit hook.

Nothing on the page may identify a person, an environment, a client or a
vendor document. The fix is upstream in atlas, never a filter here.

## The private preview

`tools/build.mjs`, `js/` and `tools/sync-internal.sh` draw atlas's internal
tier, with gaps, issue ids and the concept pages, into the git-ignored `build/`.
It is served on the Mac only and never published. `docs/diagram.md` is how its
diagram is drawn, and `docs/owner-tools.md` is what the database still holds
from the tools the published site no longer has.

## Run, check, export

From the repository root:

```sh
npm run serve -- --private   # atlas's working tree, internal tier, into build/ on :8644; never published
npm run export               # sync-export.sh from ../../atlas, then build and check
npm run serve                # the whole site on :8640, this app at /ln/
npm run check                # every gate here, plus the rest of the site
```

**Stop the private server before re-syncing**, because `sync-internal.sh`
starts with `rm -rf` on the directory it serves.

**Export from a committed, pushed atlas.** `PIN` records a commit another
machine has to be able to reproduce.

## Never edited by hand

`data/atlas/` and `index.html` are generated, and the next sync or build
overwrites them. Fix content in atlas, a component in Design, markup in
`tools/build-views.mjs`. `theme.css` and `overrides.css` are this app's
override hooks, linked after Design's own.
