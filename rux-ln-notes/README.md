# rux-ln-notes

**Infor LN scenario guides, meeting reviews and practice exercises**, at
[rux-sm.github.io/rux-ln-notes](https://rux-sm.github.io/rux-ln-notes/).
Notes renders; it does not author. The repository's `AGENTS.md` is the policy,
and its `README.md` covers setup, the commands and how a push deploys.

## What it publishes

Scenario guides, meeting reviews with their summaries, and practice exercises,
each a generated page under `guides/`, with `index.html` as the front. Every
page ends with the atlas revision it was built from. A draft guide is labelled
on the page, never withheld.

An exercise page is a worksheet. The answer spaces atlas marked are text
areas, a box column is a tick per row, the pass condition is a box, and a
question with a key can reveal it once something has been written. What a
learner types stays in their own browser, and the rail exports it as Markdown.
`js/exercise.js` is the whole of that.

## How pages are made

1. `sh tools/sync-guides.sh` copies atlas's **export tier** into `data/guides/`
   and writes `data/guides/PIN`: the atlas commit, the contract and a sha256 of
   the bytes. `tools/check-data.mjs` refuses data that does not match it.
2. `tools/build.mjs` turns each JSON file into a page. All markup lives there;
   pages link rux-ds at `/rux-ds/`.

The data contract is atlas's `_standards/guide-json.md`, and
`_standards/renderer-brief.md` §5 lists what bites when rendering it. Both are
read, never re-implemented. `docs/diagram.md` is how the diagram is drawn.

## Privacy

Atlas holds evidence, session help and screenshots of a licensed environment,
and none of it comes across. Atlas's `emit.py` refuses to write the export tier
if a name, an issue id or an evidence path survives. `check-publishable` sweeps
for names using atlas's list, from `../../rux-ln-atlas` or `ATLAS=<dir>`. CI
cannot read atlas, so that sweep runs in the pre-commit hook.

Nothing on a page may identify a person, an environment, a client or a vendor
document. The fix is upstream in atlas, never a filter here.

The internal tier, with gaps, issue ids and the concept pages, renders only
into the git-ignored `build/` and is never published.

## Run, check, export

From the repository root:

```sh
npm run serve -- --private   # atlas's working tree, internal tier, into build/ on :8644; never published
npm run export               # sync-guides.sh from ../../rux-ln-atlas, then build and check
npm run serve                # the whole site on :8640, this app at /rux-ln-notes/
npm run check                # every gate here, plus the rest of the site
```

The private preview is the everyday loop: edit Markdown in atlas, re-run, look.
**Stop that server before re-syncing**, because `sync-internal.sh` starts with
`rm -rf` on the directory it serves.

**Export from a committed, pushed atlas.** `PIN` records a commit another
machine has to be able to reproduce.

## Never edited by hand

`data/guides/`, `guides/` and `index.html` are generated, and the next sync or
build overwrites them. Fix content in atlas, a component in rux-ds, markup in
`tools/build.mjs`. `rux-theme.css` and `rux-overrides.css` here are this app's
override hooks, linked after rux-ds's own and empty by design. A rule goes
there only when this app, not rux-ds, has to change something.
