# The verbs

Everything done to the design system is one of three tasks, and each ends
by opening the page. `README.md` "Picking this up" is the current state,
`docs/roadmap.md` the decisions, `docs/log.md` the dated record. Since
2026-09-12 this folder lives inside `rux-sm.github.io`; the commands below
run from that repository's root unless they say `rux-ds/`.

Check the **exit code** of every check, never its output. The gates cannot
see everything; five shipped defects passed all of them.

Four things are never done: editing a file under `node_modules/@carbon`;
writing a `rux--*` class Carbon does not compile; `!important`; a commit
not authored by rux alone. The root `AGENTS.md` is the policy.

---

## 1 · Change a page

| | |
|---|---|
| How | Skill `rux-ds-page`. Copy the nearest `rux-ds/templates/*.html`; never start from scratch or from a guess. Markup is diffed against `docs/carbon-*.json` (`node tools/diff-fragment.mjs <name>` in `rux-ds/`). |
| Serve | `npm run serve` → `http://localhost:8640/rux-ds/` — every app on one origin, the switcher filled from the hub's list. |
| Check | `npm run check -- --full` at the root, or `npm run verify` in `rux-ds/`. Then the browser gates, below. |
| Look | The page, in every theme, from the account panel. A template's `BEHAVIOUR:` comment says what was verified and what was not. |

## 2 · Change how something looks

| The change is | It goes in |
|---|---|
| A colour, or any value a token names | `css/rux-theme.css`, inside a `[data-theme]` block |
| How a component looks beyond its tokens | `css/rux-overrides.css`, at Carbon's own specificity |
| Which components and themes compile, or the prefix | `src/app.scss`, then `npm run build` |
| In one app only | that app's own `rux-theme.css` / `rux-overrides.css` at its root |

`check-tokens` refuses a token the theme file invents; `check-classes` a
class either file selects that `rux.css` does not compile. A rule that should
not have changed anything: measure before and after.

## 3 · Release

There is none of its own. `npm run verify` in `rux-ds/`, commit, and a push
to the repository's `main` publishes the design system with every app that
uses it. A class that left fails the app's check in the same push.

---

## The browser gates

Five checks need a layout and an accessibility tree, so they run in the
page, not in Node: `check-a11y.js`, `check-rendered.js`,
`check-runtime-classes.js`, `check-spacing.js`, `check-behaviour.js`, all
under `rux-ds/tools/`. Serve the site, open the page to check, and in the
devtools console load the tool from the server so the file on disk is what
runs:

```js
(function(){ const r = new XMLHttpRequest();
  r.open('GET', '/rux-ds/tools/check-a11y.js?v=' + performance.now(), false); r.send();
  return JSON.stringify(eval(r.responseText)); })()
```

Read the **return value**, not the console. Two things that have produced
wrong answers: `check-a11y` skips its focus-ring check when the document has
no focus, so press Tab once first and confirm `focusRingChecked: true`; and a
reading taken with the wrong theme active is a reading of that theme.

Until 2026-09-12 a ledger, `docs/gate-coverage.json`, recorded which page
each gate had last been run against and `npm run gates` aged the readings
by commit. Retired: the readings stayed in the archived repository, and the
gates run whenever a page changes, from the page.
