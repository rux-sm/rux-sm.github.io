# Migration start — the state before anything moved

Recorded 2026-09-12 for `docs/platform-consolidation-plan.md` stage 1. Every
value here was read from the system that day, not from a document.

## Revisions

| Repository | HEAD | Dirty | Level with origin | GitHub |
| --- | --- | --- | --- | --- |
| rux-sm.github.io | `2a738a7` | `docs/` untracked (the plan) | yes | public, Pages from workflow |
| rux-ds | `f4b204e` | clean | yes | public, Pages from workflow, deploys on a tag |
| rux-scheduler | `c8f0660` | clean | yes | public, Pages from workflow |
| rux-ln-notes | `3466126` | clean | yes | public, Pages from workflow |
| rux-ln-atlas | `4c17ea1` | clean | yes | private, no Pages |
| rux-backend | `180a290` | clean | yes | private, no Pages — its policy said Public; corrected today |

All on `main`.

## What is deployed

| Site | Last successful deploy | Revision | When (UTC) |
| --- | --- | --- | --- |
| `/` | pages workflow, push | `2a738a7` = HEAD | 2026-09-11 21:27 |
| `/rux-ds/` | pages workflow, tag `v0.1.23` | `04fa427` — `main` is 34 commits past it | 2026-09-11 20:50 |
| `/rux-scheduler/` | pages workflow, push | `c8f0660` = HEAD | 2026-09-12 05:43 |
| `/rux-ln-notes/` | pages workflow, push | `3466126` = HEAD | 2026-09-12 22:08 |
| `/rux-ui/` | legacy Pages build from `main` | `f40e10f` | 2026-09-08 — outside this migration |

The newest DS tag is what is live; `main` is not. Pages settings for the
four sites: `build_type: workflow`, source `main:/`. rux-ui: `legacy`, `main:/`.

## Rollback, per site, today

- Hub, Scheduler, Notes: revert the bad commit and push; the workflow
  redeploys. `gh workflow run pages --ref <ref>` also works, and a rollback
  point has to be a branch or tag, not a bare SHA.
- rux-ds: `gh workflow run pages -R rux-sm/rux-ds --ref v0.1.22` redeploys an
  older tag; the page is stamped with the ref it was built from.

## Consumers outside the family

GitHub code search for `rux-sm.github.io/rux-ds` outside the four public
repositories: 0 hits. rux-ui's `index.html` does not reference rux-ds. No
consumer of the DS release process is known outside the family.

## Routes served today

Every tracked file of each public repository is served at its path. The full
lists are in `~/Developer/migration-baseline/inventory/`, outside any
repository.

| Repository | Tracked files | Top level |
| --- | --- | --- |
| rux-sm.github.io | 20 | `index.html`, `account/`, `account.js`, `switcher.js`, `switcher.json`, `brand/`, the two delta stylesheets, `tools/` |
| rux-ds | 267 | `css/`, `js/`, `assets/`, `sink/`, `templates/`, `builder/`, `theme-creator/`, `docs/`, `reference/`, `src/`, `tools/`, `brand/`, five root pages, `LICENSE`, `NOTICE`, `CHANGES.md` |
| rux-scheduler | 29 | `index.html`, `specimen.html`, `sch-data.js`, `sch.js`, `sch.css`, `brand/`, `docs/`, `tools/` |
| rux-ln-notes | 104 | `index.html`, `guides/` (27 generated pages), `data/guides/` with `PIN`, `js/`, `brand/`, `docs/`, `exchange/`, `tools/`, `MEASURED`, `.nojekyll` |

## Checks and tools that assume the current layout

| What | Assumption | Handled in |
| --- | --- | --- |
| `rux-ln-notes/tools/check-ancestry.mjs` | lists `v*` tags in `../rux-ds`, archives the newest, runs again at HEAD | stage 2: point at the in-tree DS, drop the tag lookup |
| `rux-ds/tools/lib/staleness.mjs`, `build-portal.mjs` | resolves the commit each browser reading was recorded at | stage 2: retire the ledger |
| `rux-ds/tools/lib/gates.mjs` `CONTROL_FILES`, `check-controls.mjs` | paths relative to the rux-ds root | stage 2 |
| `rux-ln-notes/tools/publish.mjs` | notes remote is `rux-sm/rux-ln-notes`; atlas at `../rux-ln-atlas` | stage 2: export and push replace it |
| `rux-ln-notes/tools/check-publishable.mjs` | atlas at `../rux-ln-atlas`; `PIN` under its own root; sweeps `.html` and `.md` | stage 2: explicit atlas path, repository-wide sweep |
| `rux-ln-notes/tools/sync-guides.sh`, `sync-internal.sh` | `../rux-ln-atlas`, `../rux-ds`, `rm -rf` of the served root, a symlink to rux-ds | stage 2 |
| every app's `tools/check.mjs`, `tools/serve.mjs`, `tools/sprite.mjs` | `../rux-ds` or `DS=` | stage 2: one root `tools/` |
| the four Pages workflows | consumers resolve the newest DS tag by `ls-remote`; the DS checks out three consumer repositories by name | stage 3: one workflow |
| `rux-ds/.claude/settings.json` | `additionalDirectories` to three siblings; a SessionStart hook runs the exchange scan | hook: stage 1, rux's to remove; directories: stage 2 |

## Timings, measured on this layout, clean trees before and after

| Check | Time |
| --- | --- |
| Notes names sweep alone | 0.08 s |
| Notes full check, rebuild and 9 gates | 2.2 s |
| DS `npm run verify`, 27 steps | 11.7 s |
| Scheduler check | 0.07 s |
| Hub check | 0.05 s |

## Renders

`~/Developer/migration-baseline/computed-values.json`: nine pages served from
a tracked-files copy of the four sites with cloud sync disabled in the copy's
`account.js`, so nothing wrote to production. Body, header, h1 and button
values, element and class counts, fonts loaded, failed resources (none).

Re-run on 2026-09-12 after the move, at `1938912`, into
`computed-values-after.json` beside it; the snapshot in `site/` was re-served
by its own server in workspace mode and measured with the same script, as the
control. Every value on all nine pages is identical before and after: theme,
colours, fonts, element, class, stylesheet and script counts, and no failed
resource. Two exceptions, neither the move's. The builder has three fewer
elements because `cbaecb7` retired the scaffold's command block after the
snapshot was taken. The resource count is timing-sensitive: it differed from
the snapshot's on every page in both reruns, and between the two reruns on
one page, so it measures the load, not the tree.

## Moved out of `AGENTS.md` today

The hub's policy carried this account; kept here as the dated record. The
shared app check was wired into `tools/check.mjs` on 2026-09-09 and should
have been at the `v0.1.6` pin: until then the file ran a class loop over four
pages named by hand and no token check, while the shared implementation sat
vendored and unrun, because a pin move rewrote `vendor/` and left `tools/`
alone. Full text: `git show 2a738a7:AGENTS.md`.
