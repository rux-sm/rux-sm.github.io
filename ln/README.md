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
- **Still to confirm** lists the tasks nobody has checked in LN.

Where the reader stopped is kept in their browser and nowhere else.
`docs/plans/ln-guide.md` in the repository root is what it is for and what is
still to build.

## How the page is made

1. `sh tools/sync-export.sh` copies atlas's **export tier** into `data/atlas/`
   and writes `data/atlas/PIN`: the atlas commit, the contract and a sha256 of
   the bytes. `tools/check-data.mjs` refuses data that does not match it.
2. `tools/build-views.mjs` writes `index.html` from that data, and lists what
   the export does not yet say. `app.css` and `app.js` are its styles and
   behaviour, `data.js` its reads and writes for the owner, and `tools/shell.mjs` is the site header.

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

## What only the owner sees

Two things come from the database after log-in, through `data.js`, and row
security gives both to the owner alone:

- **A card's whole text.** A screen's fields and an idea's full account rest on
  Infor's help, so they are never built into this page. Atlas sends them to
  `platform.ln_private` with its `tools/sync.py`, and a card reads its row
  when it opens.
- **What was confirmed.** A task atlas has no walked date for says so. The
  owner answers per step, it matched or it was different, with a line and a
  screenshot, into `platform.ln_confirmations` and the private bucket
  `ln-confirmations`. Atlas's `tools/sync.py` brings the rows home as evidence.

## Run, check, export

From the repository root:

```sh
npm run export               # sync-export.sh from ../../atlas, then build and check
npm run serve                # the whole site on :8640, this app at /ln/
npm run check                # every gate here, plus the rest of the site
```

**Export from a committed, pushed atlas.** `PIN` records a commit another
machine has to be able to reproduce.

## Never edited by hand

`data/atlas/` and `index.html` are generated, and the next sync or build
overwrites them. Fix content in atlas, a component in Design, markup in
`tools/build-views.mjs`. `theme.css` and `overrides.css` are this app's
override hooks, linked after Design's own.
