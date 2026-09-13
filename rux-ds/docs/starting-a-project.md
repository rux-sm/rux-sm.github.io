# Starting a project

**Since 2026-09-10 (roadmap §8.4, decided in §8.6) a project vendors
nothing.** One step, from a clone of rux-ds beside where the app will live:

```sh
git clone https://github.com/rux-sm/rux-ds.git
sh rux-ds/tools/new-project.sh ~/Developer/my-app --path /my-app/
```

`--path` is where the app will live under the account root, used once, for
the switcher entries it writes.

Open `~/Developer/my-app/index.html` — it links `/rux-ds/…`, which only
resolves from a server that knows where rux-ds is, so `node
~/Developer/my-app/tools/serve.mjs` (rux-ds's workspace server, every site
on one origin at `:8640`) rather than opening the file directly. It is the
app-shell template: header, side nav, a page of content, every module
running, IBM Plex loading.

Run with no arguments it asks instead: folder, template, theme, product
name, tab title, file name, each with a numbered list or a default that
Enter accepts. Flags answer the same questions for a script:

```sh
sh rux-ds/tools/new-project.sh ~/Developer/my-app --template table-page \
   --theme g10 --name Orders --title "Orders" --page orders
```

What can be chosen, and what each choice is for, is `docs/choices.md`. A
second positional argument picks another template, a third names the page:

```sh
sh rux-ds/tools/new-project.sh ~/Developer/my-app table-page orders
```

writes `orders.html` from `templates/table-page.html`. The templates are
listed by running the script with a name it does not have.

## What you get

```
my-app/
├── index.html            yours — the template, paths pointed at /rux-ds/,
│                         switcher set to Home and this app, /switcher.js linked
├── rux-theme.css         yours — token deltas only, ships empty
├── rux-overrides.css     yours — component-rule deltas only, ships empty
├── brand/                yours — logo.svg and favicon.svg, seeded once
├── AGENTS.md, CLAUDE.md  yours — the app's policy, short; imports nothing else
├── tools/check.mjs       reads rux-ds beside this repository (or DS=<dir>); your gates after it
├── tools/serve.mjs       rux-ds's workspace server on :8640, this app at its own path
├── .githooks/commit-msg  reads rux-ds's hook the same way
├── .github/workflows/pages.yml   checks rux-ds out at its newest tag, checks, then deploys
└── .claude/launch.json, .gitignore
```

Nothing of rux-ds is copied in. The launchers and `AGENTS.md` come from
`tools/app-skeleton/` on the first run only, each file only if absent; a
`rux-ds` clone beside this app (`~/Developer/rux-ds` by default, or
`DS=<dir>`) is what they read at check, serve or deploy time.

Two kinds of file. The script writes the page and the scaffold only on the
first run, then leaves your work alone on every later run — running it
again on an existing app writes nothing at all and says so (there is no pin
to move). Your page links rux-ds's theme and overrides first and your own
two after them, so rux-ds's decisions arrive on every release and yours stay
on top.

**After every run the drift report prints**: what each page's `<head>`
resources and header skeleton carry that rux-ds's own template does not, and
the reverse. It blocks nothing. A page is yours, and the report is what tells
you a shell change upstream — a preload, a panel, a module — has not reached
it; apply what you want by hand.

## Which file a change goes in

The same rule as inside rux-ds (`AGENTS.md`, "Where a change goes"):

| The change is | It goes in |
|---|---|
| A colour, or any value a token names | your `rux-theme.css`, inside a `[data-theme]` block, on top of rux-ds's own |
| How a component looks beyond its tokens | your `rux-overrides.css`, at Carbon's own specificity, no `!important` |
| A page | copy a template again; the script will not overwrite the one you have |
| Anything rux-ds ships | rux-ds itself: a request with invented content, never a local edit |

Themes: `data-theme` on `<html>` is `white`, `g10`, `g90`, `g100`, or `rux`
for the block in your theme file. The app shell's header carries its own
`g100` and keeps it whatever the page is set to.

`node tools/check.mjs` is the gate: rux-ds's shared check, read from the
checkout beside this app (or `DS=<dir>`), refuses a class rux-ds does not
compile, a `var(--rux-*)` nothing declares, a relative `href` or `src` that
names nothing, and a duplicate or dangling id. Locally that is rux-ds on
`main`; the Pages workflow checks rux-ds out at its newest tag first — what
is live at `/rux-ds/` — and runs the check against that. Nothing is copied
into rux-ds to check it — a consumer page never enters that repository, even
for a minute. What the check cannot see is how the page looks; it prints
which pages to open and names the five themes.

## Which rux-ds this app is on

The one that is live. There is no pin to move and no second command: a
rux-ds release reaches every app on its next deploy, checked first against
every served app by rux-ds's own Pages workflow (roadmap §8.4 diff B).
`CHANGES.md` in rux-ds names any class that left, newest release first, with
the commit — the one thing a live read cannot tell you, since additions are
safe and only a removal is a hazard.

Promoting a rule from an app's own delta file into rux-ds's `css/` is live
in every app the moment a tag carries it — no app holds a copy to delete.
Tag first, record after; `git tag` and `git push` as two commands, since one
command carrying both is refused here. This is the one recipe — the hub's
and Notes' READMEs point at it rather than carry their own.

**What this replaced, 2026-09-10 (roadmap §8.4, §8.6):** until then an app
vendored `css/`, `js/`, `assets/` and `templates/` under `vendor/rux-ds/`
with a `PIN` naming the tag, and every release had to be moved into each app
by hand or with `tools/roll-out.sh` before it took effect. `docs/log.md` has
the full account of why, and what it cost the one time it was forgotten.

## Measured

2026-09-02, from this checkout at `v0.1.0`: the script ran in well under a
second; clone, script and a rendered first page took under a minute, against
the ten minutes §4.11 asked for. The page was opened in the browser with every
stylesheet resolving, IBM Plex serving, the modules running, and the runtime
class check reading nothing stripped.
