# app-skeleton — what every app on rux-ds starts with

**Three files at the root and no more** — `AGENTS.md`, `CLAUDE.md`,
`README.md`. State goes in `docs/status.md`, working documents in `docs/`,
cross-repository memos in `exchange/`. `docs/consumer-policy.md` §3.1 is the
rule and why. There is no `TODO.md`.

`tools/new-project.sh` copies this directory into a project on its FIRST run
(no `tools/check.mjs` yet), each file only if absent. Nothing here holds a
rule: every file is a launcher that reads rux-ds from the checkout beside
this repository (or `DS=<dir>`), so the rules stay rux-ds's own. `@NAME@`,
`@TITLE@`, `@PATH@` and `@DIR@` are substituted; nothing else is.

| File | Is | Reads |
|---|---|---|
| `AGENTS.md` | the app's policy: what is its own, what is rux-ds's, the one check. Opens `type: app` | |
| `CLAUDE.md` | imports `AGENTS.md` | |
| `tools/check.mjs` | runs rux-ds's `tools/app-check.mjs`; app gates go after it | `../rux-ds`, or `DS=<dir>` |
| `tools/serve.mjs` | runs rux-ds's workspace server on :8640, this app at its own path | `../rux-ds`, or `DS=<dir>` |
| `.githooks/commit-msg` | runs rux-ds's hook | armed by `git config core.hooksPath .githooks` |
| `.github/workflows/pages.yml` | checks rux-ds out at its newest tag, checks, then deploys; carries no rule of its own | |
| `.claude/launch.json` | the server, for the Browser pane | |
| `.claude/settings.json` | puts `~/Developer/rux-ds` in the session's reach — **see below** | |
| `tools/sprite.mjs` | runs rux-ds's `tools/app-sprite.mjs` over this app's pages; the page list is the only thing it holds | `../rux-ds`, or `DS=<dir>` |
| `.gitignore` | `.DS_Store`, `node_modules/` | |

Until 2026-09-10 (roadmap §8.4 diff C) these files ran a copy vendored under
`vendor/rux-ds/` and a pin moved it forward; now each reads a sibling
checkout, and there is nothing to move. The hub and Notes moved to this same
shape the same day (§8.4 step 5); no app in the family vendors a copy.


## `.claude/settings.json` is a permission grant, and it is not read-only

Added 2026-09-11. Without it a session opened in an app cannot read a single
file under `../rux-ds` — the sibling is outside the working directory, so
every cross-repo read is a prompt or a refusal. An app whose `AGENTS.md` says
*every `rux--*` class comes from rux-ds's `css/rux.css`* and which cannot open
that file knows the rule and cannot check itself against it, which is the
worse half of the two.

**What the grant actually does: reads stop prompting, and writes follow the
session's permission mode.** So rux-ds becomes editable from an app session.
The rule that an app never edits the design system is still the rule — it is
now held by `AGENTS.md` and by the fact that a stray edit lands in rux-ds's
own `git status`, rather than by the filesystem. Remove the file if you want
the wall back; the cost is a prompt on every cross-repo read.

`~/Developer/rux-ds`, not `../rux-ds`: relative resolution is undocumented for
this setting and a silently ignored entry is worse than none. The tilde form
is what the settings reference shows, carries no username into a public file,
and the layout it assumes is the one these projects already keep.
