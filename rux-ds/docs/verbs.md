# The four verbs

Everything done in this family of repositories is one of four tasks. Each
has one command, one check, and one place to look afterwards. This card is
the instruction set; `README.md` "Picking this up", `docs/roadmap.md` and
`docs/log.md` are the record, and nothing you need to *do* lives only there.

Where a verb takes more than one command today, the card says so and names
what it should be. A command listed here exists; a target marked **not yet**
does not, and is the next thing to build for that verb.

Drafted 2026-09-05 from the three public repositories at `v0.1.6`. Down to
four verbs since 2026-09-10 (roadmap §8.4, §8.6): no app vendors a copy of
rux-ds any more, so the old verb 4 — moving every app's pin — has nothing
left to do, and is gone rather than kept as a no-op.

---

## Before any verb

```sh
cd ~/Developer/rux-ds && git pull --ff-only && npm install --ignore-scripts
```

Check the **exit code** of every check below, never its output. The gates
cannot see everything; five shipped defects passed all of them. Every verb
ends by opening the page.

Four things are never done, in any repository: editing a file under
`node_modules/@carbon`; writing a `rux--*` class Carbon does not compile;
`!important`; a commit not in `type(scope): Subject` form authored by rux
alone. `AGENTS.md` is the policy; this card is the routine.

---

## 1 · Change a page

*A page in rux-ds, the hub, or an app: new or edited.*

| | |
|---|---|
| How | Skill `rux-ds-page`. Copy the nearest `templates/*.html`; never start from scratch or from a guess. Markup is diffed against `docs/carbon-*.json` (`node tools/diff-fragment.mjs <name>`). |
| Serve | rux-ds: `npm run serve` → `http://localhost:8642`. An app: `node tools/serve.mjs` → `http://localhost:8640`, the workspace server every app's launcher delegates to since no app can be shown styled from its own folder alone — `/` the hub, `/<name>/` each app, `/rux-ds/` this repository. The switcher fills from the hub's list there. |
| Check | rux-ds: `npm run verify`. An app: `node tools/check.mjs` — rux-ds's shared check, read from the checkout beside it (or `DS=<dir>`): classes, tokens, local references, ids — then the app's own gates. Browser gates: skill `sink-check`; `npm run gates` says which page was last swept and fails on one never swept. |
| Look | The page, in the browser, in every theme — white, g10, g90, g100, rux — from the account panel. The template's `BEHAVIOUR:` comment says what was verified and what was not. |

One command today. Notes is the exception: its pages are generated, so the
edit goes in `tools/build.mjs`, then `node tools/build.mjs`, then the check.

## 2 · Change how something looks

*A colour, a spacing, a component's appearance — in one app or in all of them.*

| The change is | It goes in | Reaches |
|---|---|---|
| A colour, or any value a token names | `rux-theme.css`, inside a `[data-theme]` block | |
| How a component looks beyond its tokens | `rux-overrides.css`, at Carbon's own specificity | |
| — in one app only | that app's own pair, at its root | that app |
| — in every app | `css/` pair in rux-ds | every app, on the next release (verb 4) — no separate step moves it further |

| | |
|---|---|
| Check | rux-ds: `npm run verify` — `check-tokens` refuses a token the theme file invents, `check-classes` a class either file selects that `rux.css` does not compile. An app: `node tools/check.mjs` — the shared check, read from the rux-ds checkout beside it, refuses a class or a `var(--rux-*)` nothing declares, in the page, the two delta files and local scripts. Nothing is ever copied into rux-ds to check it. |
| Look | The component, in the sink or on the page, in every theme. A rule that should not have changed anything: measure before and after. |

One edit today. A rule promoted from an app's pair into rux-ds's is live in
every app the moment a release tag carries it — no app holds a copy to
delete or a pin to move (roadmap §8.4, §8.6).

## 3 · Add an app

*A new module on rux-ds, joining the switcher on every site.*

One command, then two things by hand — create the repository, add one line
to `switcher.json`. (Until 2026-09-05: nine steps, seven by hand.)

```sh
# from rux-ds on main, naming a tag that carries tools/app-check.mjs
sh tools/new-project.sh ~/Developer/<name> --tag vX.Y.Z \
   --name <Name> --title "Rux <Name>" --path /<name>/
```

It asks the template, theme and file name it was not given, vendors the
release, writes the page with its switcher set to Home and this app and
`/switcher.js` linked, copies `tools/app-skeleton/` — the check and serve
launchers, the hook, the Pages workflow, `AGENTS.md`, `launch.json`,
`.gitignore` — runs the new app's `node tools/check.mjs`, and prints what is
left. From a tag older than the check it says the launchers point at nothing
yet, and does not fail.

Then, by hand:

1. `git init && git config core.hooksPath .githooks`. Create the repository: an agent may run `gh repo create` once rux has named the app in the conversation (rule changed 2026-09-06; it was rux's alone before). The REST form, `gh api -X POST /user/repos`, is still refused to an agent and is not a fallback. Enabling Pages stays rux's click; the Pages API is refused.
2. In the hub, add one entry to `switcher.json`: `{ "name", "path": "/<name>/", "description" }`. That is the whole registry; the panel and the launcher read it at runtime, and the hub README no longer carries a copy. `node tools/check.mjs` there.
3. Open the page in every theme. Commit and push both.

| | |
|---|---|
| Look | `https://rux-sm.github.io/` — the new card; the switcher panel on Notes — the new entry, marked current on its own site. |

## 4 · Release the design system

*Cut a tag. Since `v0.1.15` (2026-09-10, roadmap §8.4 diff B) the tag IS
the deploy: pushing it publishes this site, after a `consumers` job has
checked every app that links `/rux-ds/` against the tree, and every app
reads it on its next load — there is no separate step, because no app
vendors a copy (§8.4 steps 2–5, done 2026-09-10).*

```sh
npm run verify            # every Node gate, exit code
npm run gates             # every browser cell swept against the current page
```

If a class or component left, one line in `CHANGES.md`, newest first, with
the commit; the tag is then a **minor**. Otherwise a **patch**. `v1.0.0` when
rux says so. Nothing else is recorded — additions are safe.

```sh
git tag vX.Y.Z
git push origin vX.Y.Z    # two commands; one carrying both is refused
gh run watch "$(gh run list --workflow=pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
```

The run is three jobs: `check` (`npm run verify`), `consumers` (the shared
check on every app — `NOT RUN` with its pin is the branch for one that
vendors, kept defensively though no app in the family does any more),
`deploy`. A red `consumers` deploys nothing and the last release keeps
serving; fix the app or the tree, then push a new tag.

**Roll back** by redeploying the previous tag — no tag is deleted, no
history rewritten, and the same command redeploys forward again:

```sh
gh workflow run pages.yml --ref vX.Y.Z   # the tag to put live
```

**The `github-pages` environment must allow tags**: a rule `v*` under
Settings → Environments → github-pages → deployment branches and tags.
Without it the deploy job fails before its first step — *not allowed to
deploy due to environment protection rules* — which is how `v0.1.15`'s
first run ended. A repository setting, rux's to change.

| | |
|---|---|
| Look | The live home page's stamp names the tag — `git describe --tags` on a checkout names the NEWEST tag, never the deployed one. `CHANGES.md` says what left. Every app, in every theme, reads it on its next load. |

---

## What each repository is

One table, in one place: the workspace page in rux's config
(`~/claude-config/workspaces/rux-ln.md`, private) — for each repository, how
to run it, where to edit, how to verify and how it is released. This card
carried a copy of that table until 2026-09-09; it was missing the scheduler
for four days, which is what a second copy does. It now carries the pointer.

An app is `index.html` linking `/rux-ds/…`, two delta CSS files, and the
launchers `tools/app-skeleton/` writes — a check, a server and a hook that
each read rux-ds live from the checkout beside it, so the rules are always
whatever rux-ds's newest release says (roadmap §8.4, done 2026-09-10).

**Two apps carry more than that, for two different reasons.** Notes generates
its pages, because the data behind them is private. Scheduler owns components
this design system does not have, in `sch.css`, `sch.js` and `sch-data.js`.
Neither reason travels to the next app; an app that needs neither is the four
files above.
