# Naming plan — working document

**A draft under review, 2026-09-12.** One rule per layer, every name derived
from one word per app. Revised until it is right, then applied in the order
at the end, then this file is deleted. `docs/status.md` points here until then.

## The principle

Each name lives in exactly one place and every other name is derived from
it. An app has one word. Its folder, URL, page titles, class prefix and
commit scope all follow from that word mechanically. Nothing carries an
owner prefix, because the GitHub account is already the namespace.

## The map

```
NOW                                          CLEAN
~/Developer/                                 ~/Developer/
├── rux-sm.github.io/                        ├── rux-sm.github.io/            (name fixed by GitHub)
│   ├── index.html   "Rux Home"              │   ├── index.html   "Rux"
│   ├── account/     "Account settings —     │   ├── account/     "Account — Rux"
│   │                 Rux Home"              │   │
│   ├── rux-ds/      /rux-ds/                │   ├── design/      /design/
│   │   ├── index.html "rux-ds — home"       │   │   ├── index.html "Design"
│   │   ├── builder.html "rux-ds — builder"  │   │   ├── builder.html "Builder — Design"
│   │   ├── kitchen-sink.html                │   │   ├── kitchen-sink.html "Kitchen sink — Design"
│   │   ├── theme-creator.html               │   │   ├── theme-creator.html "Theme creator — Design"
│   │   └── css/rux.css  classes rux--*      │   │   └── css/rux.css  classes rux--*   (unchanged)
│   ├── rux-scheduler/  /rux-scheduler/      │   ├── scheduler/   /scheduler/
│   │   ├── index.html "Scheduler"           │   │   ├── index.html "Scheduler"
│   │   ├── specimen.html "Trip bar specimen"│   │   ├── specimen.html "Trip bar specimen — Scheduler"
│   │   ├── sch.js  sch.css  sch-data.js     │   │   ├── app.js  app.css  data.js
│   │   ├── rux-theme.css rux-overrides.css  │   │   ├── theme.css  overrides.css
│   │   └── classes sch-*                    │   │   └── classes scheduler-*
│   ├── rux-ln-notes/   /rux-ln-notes/       │   ├── notes/       /notes/
│   │   ├── index.html "LN Notes"            │   │   ├── index.html "Notes"
│   │   ├── guides/SG-ship-from-stock.html   │   │   ├── guides/ship-from-stock/
│   │   ├── rux-theme.css rux-overrides.css  │   │   ├── theme.css  overrides.css
│   │   └── classes ln-*                     │   │   └── classes notes-*
│   ├── docs/  tools/  AGENTS.md             │   ├── docs/  tools/  AGENTS.md  (unchanged)
│   └── switcher.json  Home · LN Notes ·     │   └── switcher.json  Home · Notes ·
│                      Scheduler · Design    │                      Scheduler · Design
│                      System                │
├── rux-ln-atlas/                            ├── atlas/
│   ├── _inbox/  _standards/                 │   ├── inbox/  standards/
│   ├── guides/SG-ship-from-stock.md         │   ├── guides/SG_ship-from-stock.md
│   ├── exercises/HOMEWORK-production-...md  │   ├── exercises/EX_production-...md
│   └── tests/RUN-SHEET-order-quantities.md  │   └── tests/RS_order-quantities.md
├── rux-ui/            (old app)             ├── rux-ui/            (unchanged, no collision — see below)
├── CLAUDE.md  rux.code-workspace            ├── CLAUDE.md  rux.code-workspace
~/claude-config/                             ~/dotfiles/
```

## One word per app, everything derived

| App word | Folder / URL | Title suffix | Class prefix | Commit scope |
| :--- | :--- | :--- | :--- | :--- |
| Rux | `/` | `— Rux` | `rux--` | `site` |
| Design | `/design/` | `— Design` | `rux--` | `design` |
| Scheduler | `/scheduler/` | `— Scheduler` | `scheduler-` | `scheduler` |
| Notes | `/notes/` | `— Notes` | `notes-` | `notes` |
| Atlas | `../atlas` | | | `atlas` |

## The rules, one per layer

| Layer | Rule |
| :--- | :--- |
| Display name | one or two plain words, title case |
| Folder and URL | the display name lowercased; no owner prefix; lowercase always |
| Page title | `Page — App`; an app's front page is just `App`; the site root is `Rux` |
| Class prefix | the folder name plus a hyphen; `rux--` is the design system's and never an app's |
| Files inside an app | generic: `index.html`, `app.js`, `app.css`, `data.js`, `theme.css`, `overrides.css` |
| Commit scope | the folder name, or `site` for the root |
| Repositories | no prefix; the account is the namespace; the Pages repository keeps the name GitHub requires |
| Atlas documents | `CLASS_slug-with-hyphens`, and dates as `_YYYY-MM-DD` where a class carries one |
| Atlas folders | plain lowercase words; nothing starts with a symbol |

## Atlas file classes

| Class | Now | Clean |
| :--- | :--- | :--- |
| guide | `SG-ship-from-stock` | `SG_ship-from-stock` |
| exercise | `HOMEWORK-production-and-planning` | `EX_production-and-planning` |
| test | `RUN-SHEET-order-quantities` | `RS_order-quantities` |
| ledger, walk, evidence | `LG_…`, `WK_…`, `SS_…` | unchanged, already this shape |

## Unchanged on purpose

The site repository's name. `rux--` classes and `rux.css`. The design
system's page file names. `docs/` and `tools/`. The old rux-ui app.

## Open questions

None left. See "Decisions taken so far".

## Order of work, once agreed

1. Titles, commit scopes, file names inside apps. Cheap.
2. App folders and URLs, with redirect stubs if wanted. Search-and-replace
   the absolute paths, run the check, push.
3. Repositories and local folders. GitHub redirects old names. Relink the
   two memory folders afterwards.
4. Atlas ids and folders. Its own session; the gate is the judge.

## Decisions taken so far

- **The design system's name is Rux Design System, in full.** Chosen from
  the start, before this rebuild used Carbon as a base — not a category
  label picked for this plan. Derived word: **Design**. Folder `/design/`,
  titles `Page — Design`, scope `design`, switcher entry shown as "Design"
  with the description carrying the full name, "Rux Design System". Class
  prefix stays `rux--`, since that names the product, not the folder. No
  collision with the old `rux-ui` app; that name is untouched. Decided
  2026-09-12.

- **Notes, not LN Notes.** Checked first: the switcher's own description
  already reads "Step-by-step scenario guides" with no "LN" in it, no
  second notes app is planned or mentioned anywhere in the repositories,
  and the rule applied to every other app is to name it for what it does
  today, not to reserve room for a hypothetical one — Scheduler is not
  "Bus Scheduler", Design is not "Rux Carbon Design System". If a second
  notes app is ever built, it earns its own distinct word, the same way
  Design and Scheduler would. Decided 2026-09-13.

- **No redirect stubs for the renamed URLs.** Checked first: no
  `robots.txt` or sitemap, zero stars on the public repository, and
  nothing in either repository's docs describes a client holding a
  bookmarked link to a specific page — atlas's "what a client sees"
  language is about the content a page shows, not about an outside
  audience with existing URLs today. A stub for every renamed path would
  be permanent upkeep serving no one but rux, whose own bookmarks he
  updates once. If atlas's export ever reaches a real outside reader with
  a link worth honouring, that is the day to add a redirect for that one
  path, not before. Decided 2026-09-13.

- **`claude-config` keeps its name.** Checked first: its own README opens
  with "Private, cross-machine Claude Code configuration and memory for
  both Macs" — it holds no shell, editor or git configuration, so it is
  not a dotfiles repository in the sense the word usually means, and
  renaming it to `dotfiles` would describe it less accurately than its
  current name already does. Decided 2026-09-13.

- **The backend repository is gone, not renamed.** Nothing ran from it,
  and with every app in one repository a shared database no longer needs a
  repository of its own. Archived on GitHub, private, on 2026-09-13; database
  changes go through the Supabase connection. Decided 2026-09-13.
