# LN Guide

**Infor LN tasks to follow, one step at a time**, at
[rux-sm.github.io/ln](https://rux-sm.github.io/ln/). LN Guide draws; it does
not author. The repository's `AGENTS.md` is the policy, and its `README.md`
covers setup, the commands and how a push deploys.

## What it is

A documentation site, one file per page, with a walked mode inside it:

- **Home**, `home.html`, asks what you are doing: a search box, the place you
  stopped, the processes in the order to learn them, and what is still to
  confirm.
- **A process**, `follow/<id>.html`, is the path of its tasks, with each
  decision drawn as a fork, and what to look up folded beneath.
- **A task**, `do/<id>.html`, is a document first: its steps on one page,
  with Why LN works this way, If something goes wrong, Variations and Related
  folded beneath. **Walk it** turns it into Guided, one step at a time; a
  phone opens Guided and a wide screen the Full page.
- **A screen**, `screens/<code>.html`, and **an idea**, `ideas/<id>.html`,
  each have a page, and `do/`, `screens/` and `ideas/` each have an index.
- **Search**, `search.html`, reads `search.json`, the one file that indexes
  every task, problem, process, screen and idea.
- **Print**, on a task and a process, prints the Full page from the browser's
  dialog, where Save as PDF is a destination; `print.css` keeps the paper
  light with no fills, and the PDF takes the page's title as its name.

Where the reader stopped is kept in their browser and nowhere else.
`docs/plans/ln-guide.md` in the repository root is what it is for and what is
still to build.

- **Still to confirm**, `confirm.html`, lists the tasks nobody has walked in
  LN; Guided carries the owner's two answers under each of their steps.

**The one-page guide is still here.** `index.html`, written by
`tools/build-page.mjs` with `page.js`, stays until the pages print; the plan
says when it goes.

## How the page is made

1. `sh tools/sync-export.sh` copies atlas's **export tier** into `data/atlas/`
   and writes `data/atlas/PIN`: the atlas commit, the contract and a sha256 of
   the bytes. `tools/check-data.mjs` refuses data that does not match it.
2. `tools/build-views.mjs` writes the pages from that data, one file each,
   and lists what the export does not yet say. `app.css` and `app.js` are
   their styles and behaviour, `data.js` the reads and writes for the owner,
   and `tools/shell.mjs` is the site header.

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

`data/atlas/`, `index.html`, `home.html`, `search.html`, `search.json`,
`confirm.html` and every page under `do/`, `follow/`, `screens/` and `ideas/` are generated, and
the next sync or build overwrites them. Fix content in atlas, a component in
Design, markup in `tools/build-views.mjs`. `theme.css` and `overrides.css` are this app's
override hooks, linked after Design's own.
