# Rux Apps

Every app rux builds, one repository, served as-is by GitHub Pages at
https://rux-sm.github.io/. The folders are the site:

| Folder | Serves | What |
| :--- | :--- | :--- |
| `index.html`, `account/`, `switcher.json`, `switcher.js`, `account.js` | `/` | the hub: the front door and the account panel |
| `rux-ds/` | `/rux-ds/` | the design system — Carbon v11 compiled under the `rux` prefix, its kitchen sink, templates, page builder and theme creator |
| `rux-scheduler/` | `/rux-scheduler/` | fleet scheduling and dispatch |
| `rux-ln-notes/` | `/rux-ln-notes/` | Infor LN scenario guides, rendered from the private `rux-ln-atlas` |
| `tools/` | — | the four commands below |
| `docs/` | — | the plan, the backlog, the migration record |

`AGENTS.md` is the policy. `docs/status.md` is what is unfinished.

## Setup, once

```sh
git clone https://github.com/rux-sm/rux-sm.github.io.git
cd rux-sm.github.io
git config core.hooksPath .githooks        # the privacy sweep and the fast check, before every commit
(cd rux-ds && npm ci --ignore-scripts)     # Carbon and Sass, for rux-ds's build and verify
```

Notes work also needs the private library cloned beside this repository:
`../rux-ln-atlas`. Database work needs `../rux-backend`.

## Every day

```sh
npm run serve                  # http://localhost:8640/ — the whole site, loopback only
npm run serve -- --private     # atlas's internal tier on :8644, never published
npm run build                  # regenerate what is committed but derived
npm run check                  # every app, Notes' gates, the names sweep; --full adds rux-ds verify
npm run export                 # pull atlas's export tier into Notes, rebuild, check
git push                       # publishes, after CI runs the full check
```

A page links `/rux-ds/css/rux.css` and `/rux-ds/assets/fonts/…` by absolute
path, so served from this folder it renders with no internet connection.
Opening a file with `file://` does not work; use the server.

## A new app

Make a folder named for its URL, start its `index.html` from a page in
`rux-ds/templates/`, add one entry to `switcher.json`. The check reads that
list, the switcher fills from it, and the next push publishes it.

## How it deploys

`.github/workflows/pages.yml`: every push runs `npm run check -- --full` and
refuses a tree whose committed output is stale; a push to `main` then uploads
the tree and deploys it. A failing push stays in git and the last good
deployment keeps serving. Rollback is `git revert` and push.

## Where it came from

Until 2026-09-12 the design system and each app were separate repositories
with their own release process. `docs/platform-consolidation-plan.md` is the
plan that folded them in here, and `docs/migration-start.md` the state they
were in. The old repositories stay on GitHub as history.
