# Notes

**Infor LN walkthroughs, meeting reviews and practice experiments**, at
[rux-sm.github.io/notes](https://rux-sm.github.io/notes/).
Notes renders; it does not author. The repository's `AGENTS.md` is the policy,
and its `README.md` covers setup, the commands and how a push deploys.

## What it publishes

Walkthroughs, meeting reviews with their summaries, and practice experiments,
each a generated page under `pages/`, with `index.html` as the front. Every
page ends with the atlas revision it was built from. A draft walkthrough is labelled
on the page, never withheld.

An experiment page is a worksheet. The answer spaces atlas marked are text
areas, a box column is a tick per row, the pass condition is a box, and a
question with a key can reveal it once something has been written. What a
learner types stays in their own browser, and the rail exports it as Markdown.
`js/experiment.js` is the whole of that.

**The front is the path**: the overview's tiles in one column, each opening
in place into the steps of the phases atlas says it opens and its way on, with
a notepad beside it. Atlas's tasks sit beneath the tile they vary, or behind an
Other tasks switch when they stand alone. The private preview shows each tile's
gaps as quests from its data; the export tier carries no gaps. `js/path.js` is its
behaviour; for the owner, `js/tile-walk.js` is Walk this and `js/tile-owner.js`
shows the quests from the database and keeps the notepad and files in the account.

**For the owner, signed in,** `js/online.js` shows what every page carries
hidden: a review box at its foot, which records Approve or Request changes,
and a link to the walk page, `pages/walk.html`, where `js/walk.js` saves a
walk and its screenshots as it goes. It also keeps an experiment's worksheet in
the account, so another device opens the same answers. All of it is kept in
`platform.notes_*` and a private bucket that only the owner can reach, and
atlas's `tools/pull.py` brings it into atlas.

## How pages are made

1. `sh tools/sync-export.sh` copies atlas's **export tier** into `data/atlas/`
   and writes `data/atlas/PIN`: the atlas commit, the contract and a sha256 of
   the bytes. `tools/check-data.mjs` refuses data that does not match it.
2. `tools/build.mjs` turns each JSON file into a page. All markup lives there;
   pages link Design at `/design/`.

The data contract is atlas's `standards/export-json.md`, and
`standards/renderer-brief.md` §5 lists what bites when rendering it. Both are
read, never re-implemented. `docs/diagram.md` is how the diagram is drawn.

## Privacy

Atlas holds evidence, session help and screenshots of a licensed environment,
and none of it comes across. Atlas's `emit.py` refuses to write the export tier
if a name, an issue id or an evidence path survives. `check-publishable` sweeps
for names using atlas's list, from `../../atlas` or `ATLAS=<dir>`. CI
cannot read atlas, so that sweep runs in the pre-commit hook.

Nothing on a page may identify a person, an environment, a client or a vendor
document. The fix is upstream in atlas, never a filter here.

The internal tier, with gaps, issue ids and the concept pages, renders only
into the git-ignored `build/` and is never published.

## Run, check, export

From the repository root:

```sh
npm run serve -- --private   # atlas's working tree, internal tier, into build/ on :8644; never published
                             # the walk form at /walk/ saves into atlas through tools/serve-walk.mjs on :8645
npm run export               # sync-export.sh from ../../atlas, then build and check
npm run serve                # the whole site on :8640, this app at /notes/
npm run check                # every gate here, plus the rest of the site
```

The private preview is the everyday loop: edit Markdown in atlas, re-run, look.
**Stop that server before re-syncing**, because `sync-internal.sh` starts with
`rm -rf` on the directory it serves.

**Export from a committed, pushed atlas.** `PIN` records a commit another
machine has to be able to reproduce.

## Never edited by hand

`data/atlas/`, `pages/` and `index.html` are generated, and the next sync or
build overwrites them. Fix content in atlas, a component in Design, markup in
`tools/build.mjs`. `theme.css` and `overrides.css` here are this app's
override hooks, linked after Design's own and empty by design. A rule goes
there only when this app, not Design, has to change something.
