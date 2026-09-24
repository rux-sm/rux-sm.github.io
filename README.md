# Rux Apps

Every app rux builds, one repository, served as-is by GitHub Pages at
https://rux-sm.github.io/. The folders are the site:

| Folder | Serves | What |
| :--- | :--- | :--- |
| `index.html`, `account/`, `login/`, `switcher.json`, `switcher.js`, `account.js`, `funnel.js`, `robots.txt` | `/` | the hub: the front door, the account panel, the log-in page and the page lock |
| `design/` | `/design/` | the design system: Carbon v11 compiled under the `rux` prefix, its kitchen sink, templates, page builder and theme creator |
| `scheduler/` | `/scheduler/` | fleet scheduling and dispatch |
| `notes/` | `/notes/` | Infor LN walkthroughs, rendered from the private `atlas` |
| `pixels/` | `/pixels/` | picture logic puzzles and a maker to draw them |
| `tools/` | — | the commands below |
| `docs/` | — | `docs/status.md`, what is unfinished, `docs/database-access.md`, who may read the database, and `docs/plans/`, changes being decided or built |

`AGENTS.md` is the policy, including how documents are kept.

## Setup, once

```sh
git clone https://github.com/rux-sm/rux-sm.github.io.git
cd rux-sm.github.io
git config core.hooksPath .githooks        # the privacy sweep and the fast check, before every commit
(cd design && npm ci --ignore-scripts)     # Carbon and Sass, for Design's build and verify
git clone --depth 1 https://github.com/carbon-design-system/carbon-website.git design/carbon-website
```

`design/carbon-website/` is gitignored and named by a document, so the docs
check fails without it.

Notes work also needs the private library cloned beside this repository, under
the name every tool looks for:

```sh
git clone https://github.com/rux-sm/rux-ln-atlas.git ../atlas
```

Database work needs no checkout; `AGENTS.md` says how.

## Every day

```sh
npm run serve                  # http://localhost:8640/ — the whole site, loopback only, offline
npm run serve -- --cloud       # http://localhost:8641/ — the same, with log-in and live data
npm run serve -- --private     # atlas's internal tier on :8644, never published
npm run build                  # regenerate what is committed but derived
npm run check                  # every app, Notes' gates, the names sweep; --full adds Design verify
npm test                       # the same check, under the name every tool expects
npm run export                 # pull atlas's export tier into Notes, rebuild, check
git push                       # publishes, after CI runs the full check
```

A page links `/design/css/rux.css` and `/design/assets/fonts/…` by absolute
path, so served from this folder it renders with no internet connection.
Opening a file with `file://` does not work; use the server.

## A new app

Make a folder named for its URL, start its `index.html` from a page in
`design/templates/`, add one entry to `switcher.json`. The check reads that
list, the switcher fills from it, and the next push publishes it.

## How it deploys

`.github/workflows/pages.yml`: every push runs `npm run check -- --full` and
refuses a tree whose committed output is stale; a push to `main` then uploads
the tree and deploys it. A failing push stays in git and the last good
deployment keeps serving. Rollback is `git revert` and push.
