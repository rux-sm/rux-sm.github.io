# rux-ds

A framework-free UI kit built from Carbon v11, compiled under the `rux` prefix,
that rux's apps use as static CSS, HTML and JS. Public. Published at
https://rux-sm.github.io/rux-ds/ and listed in the app switcher as "Design
System"; the site serves the working tree.

**An agent starts at the repository's `AGENTS.md`**, the policy. This file is
how the design system works and where things are. Open work is in the site's
`docs/status.md`, and counts live in `portal.html`, never in prose.

## Picking this up

**`main` is what is published.** rux-ds is a folder of the site repository,
and a push to `main` deploys it with every app, after CI runs the full check.

**Nothing vendors rux-ds.** The scheduler, the hub and Notes all link
`/rux-ds/` live from the same repository, with no copy and no pin.

**Carbon stays installed.** Removing `@carbon/*` from `node_modules` is
declined while components are still being admitted.

**What ships:** the compiled keep-set, the behaviour modules, the templates,
the component index, the page builder and the Theme Creator.

## Run, edit, verify, release

The full routine, with what to look at afterwards, is `docs/verbs.md`.

| Task | Command | Then |
|---|---|---|
| Run | `npm run serve` from the repository root → `http://localhost:8640/rux-ds/` — every app on one origin, the switcher filled from the hub's list | open the sink, the portal, a template |
| Edit a page | skill `rux-ds-page`: copy the nearest `templates/*.html` | `node tools/diff-fragment.mjs <name>` against the captures |
| Edit a colour or token value | `css/rux-theme.css`, inside a `[data-theme]` block | |
| Edit how a component looks | `css/rux-overrides.css`, at Carbon's own specificity | |
| Edit which components or themes compile | `src/app.scss` | `npm run build` |
| Verify | `npm run verify` — **check the exit code, not the output** | the five browser gates, from the served page's console — `docs/verbs.md` |
| Release | none of its own since 2026-09-12: `npm run verify`, commit, and a push to the repository's `main` publishes the design system with every app that uses it | a class that left fails the app's check in the same push |

**`npm install --ignore-scripts` before `npm run verify`, after any pull that
touches `package.json`** — `npm ci --ignore-scripts` on a fresh clone. `verify`
rebuilds `css/` from whatever Carbon is in `node_modules` and never checks that
against the pin, so a stale install rewrites the committed stylesheet from the
old Carbon and exits 0.

### More commands

| | |
|---|---|
| `npm run build` | `src/app.scss` → `css/rux.css` + `.min.css`, verifies zero `cds` |
| `npm run sink` | assembles `sink/*.html` → `kitchen-sink.html` |
| `npm run icons` | quarries `assets/icons.svg` from `@carbon/icons` |
| `npm run inventory` | per-component classes and size → `docs/inventory.json` |
| `tools/extract/` | quarries Carbon's rendered markup → `docs/carbon-co-classes.json`, `docs/carbon-*-dom.json`, and — via the state recipes in `react-dom.js` — `docs/carbon-react-states.json`. Its `spacing` mode captures COMPUTED box properties instead, folded into a signature table — the one question the markup captures cannot answer |
| `tools/check-icons.mjs --unused` | the sprite's symbols nothing in the shipped sink references; `--deferred` is the ones `sink/deferred/` would need back |
| `tools/check-provenance.mjs --inferred` | the fragments whose markup was never diffed against a reference |
| `tools/diff-fragment.mjs <name> --omissions` | where a fragment's nesting disagrees with Carbon, and what Carbon renders that it omits |
| `npm run serve` | kitchen sink at `http://localhost:8642` |
| `npm run serve:workspace` | every site on one origin at `http://localhost:8640`, laid out as the live sites are: `/` the hub, `/rux-ds/`, `/rux-scheduler/`, `/rux-ln-notes/` |
| `npm run watch` | rebuild CSS on change |

## Figures

**Current figures are generated, not typed.** The table below is rewritten on
every `npm run verify`; `portal.html` is the component set. The two
capture-backed gates print this, re-measured
2026-09-02, still 0 findings on both:

    check-tags      669 stories · 2208 classes · 81 with no reference · 10 known · 0 on a different element
    check-ancestry  669 stories · 550 corroborated ancestries · 84 declined · 0 missing

<!-- STATS:BEGIN -->
| | |
|---|---|
| Components | **77 / 83 compiled** in 80 `@use` lines — `data-table` is four of them — and `docs/inventory.md` decides all 83, which `check-inventory` fails if it stops |
| Themes | 4 — white, g10, g90, g100 — plus `geist`, `linear`, `ant-dark` and `spotify`, token override blocks in `css/rux-theme.css`, not a compile |
| Tokens · classes | **626** `--rux-*` defined, 10 more read through a fallback · **1,798** `.rux--*` |
| Kitchen sink | **68** sections · **992** classes with `templates/` and `js/` |
| Class coverage | **948 / 1,356 (70%)** — ratcheted in `docs/coverage.json` |
| Spacing scale | 13 `--rux-spacing-*` tokens, demoed in the `spacing` section |
| Markup provenance | **74 `rendered-dom` · 6 `source` · 0 `inferred`** across 80 files |
| Icons | 63 symbols in a 17.7 KB sprite — 51 referenced, 12 nothing points at |
| Size | 1023.9 KB raw · 920.9 KB min · **91 KB gzipped** |
| Behaviour JS | **18** modules · **59 KB gzipped** · 194.7 KB raw, 62% of it comment · 74.1 KB of code |

**Every figure above is generated** by `tools/build-readme.mjs` from
`tools/lib/stats.mjs`, rewritten on every `npm run verify`, and CI fails if the
committed copy is stale — the same contract `css/`, `kitchen-sink.html` and
`portal.html` are already under. Do not edit the table by hand; the next build
overwrites it. The gzipped figures are whole KB on purpose: they are read at
level 9 and the last hundred bytes still depend on the zlib the running Node
bundles, so an exact figure makes the build fail on whichever machine did not
generate it. The tripwires those
sizes run against — 96 KB for `css/`, 60 KB for `js/` — are decisions rather
than measurements and live with their reasoning in `tools/build.mjs`.
<!-- STATS:END -->

## Where things are

| Path | What |
|---|---|
| `AGENTS.md` | the policy, binding every agent; `CLAUDE.md` imports it |
| `src/app.scss` | the build manifest — which components and themes compile, under which prefix. |
| `css/` | build output, generated and committed: `rux.css`, `rux.min.css`, and the two files every page links after them — `rux-theme.css` (token values) and `rux-overrides.css` (component rules) |
| `js/` | the behaviour layer; `overlay.js` is the kernel and loads first. |
| `templates/` | complete pages, shell included; copy the nearest one. |
| `sink/` | one markup fragment per component, plus `ORDER`, `harness.css`, `harness.js` |
| `kitchen-sink.html` · `portal.html` · `builder.html` · `theme-creator.html` | generated — edit `sink/`, `docs/component-docs.json`, `builder/` or `theme-creator/` and rebuild |
| `index.html` | the site's home page, hand-authored — the only root page that is not generated |
| `builder/` | the page builder's behaviour and data; `rewrites.mjs` is the one place a template becomes a page. |
| `theme-creator/` | the Theme Creator's behaviour, contrast maths and hue families. |
| `assets/icons.svg` | the sprite, generated by `npm run icons`, inlined by every page |
| `assets/fonts/` | IBM Plex, self-hosted and opt-in via `plex.css`; OFL-1.1 |
| `brand/` | `logo.svg` and `favicon.svg`, hand-owned; swap the file and every shell follows. `brand/README.md` has the sizes |
| `assets/brand/` | two app icons generated from the logo by `npm run marks`, never hand-edited |
| `tools/` | every build and check script; `serve.mjs` serves, and from the repository root serves the whole site |
| `tools/lib/gates.mjs` | the gate registry: what each gate catches and is blind to, rendered into `portal.html` |
| `docs/*.md` | `verbs.md` the routine · `choices.md` what an app may choose · `starting-a-project.md` · `verifying-templates.md` · `composing-pages.md` · `screen-reader-pass.md` · `inventory.md` every component's disposition · `builder-coverage.md` the builder's catalogue · `agent-tooling.md` the maintenance instruments · `commits.md` |
| `docs/*.json` | the Carbon captures and expected results the gates compare against — `carbon-*.json`, `coverage.json`, `inventory.json`, `token-values.json`. Written by `tools/extract/` and the build; controls, never hand-edited |
| `LICENSE` · `NOTICE` | Apache-2.0; `NOTICE` names each artefact carrying Carbon-derived material |
| `carbon-website/` | gitignored quarry of Carbon's docs; read from, never shipped |

## The one rule

**No Carbon file is ever edited.** Customisation is `$prefix`, Carbon's own config
flags, which components and themes compile, and the two files above the build.
One documented exception, enforced on every build: `tools/build.mjs` renames
`--cds-grid-*`, which Carbon hardcodes past `$prefix`.

## Gates

None is sufficient alone. `portal.html` lists them.

| Gate | Catches | Blind to |
|---|---|---|
| `build.mjs` namespace check | `cds` leakage into output | anything visual |
| `build-portal.mjs` icon assertion | a `#i-name` emitted into `portal.html` that the sprite has no `<symbol>` for — it caught `#i-katex` on its first run | every page it does not generate; its unit is `portal.html` alone |
| `build-builder.mjs` icon assertion | a `#i-name` emitted into `builder.html` that the committed sprite has no `<symbol>` for | every page it does not generate — its unit is `builder.html` alone, and never the page inside its preview |
| `check-classes.mjs` | a class used in HTML **or `js/`** with no CSS behind it · a class whose component was stripped | a class that resolves but renders wrong |
| `check-tokens.mjs` | a `var(--rux-*)` that resolves to nothing | a token whose *value* moved — `check-token-values` covers the values **declared in `css/rux.css`** and only those |
| `check-token-values.mjs` | a `--rux-*` value that moved, was added or was dropped under a stable name, keyed by the context declaring it | a value that changes only through the CASCADE — it reads what `css/rux.css` declares, not what a browser computes |
| `check-icons.mjs` | a `<use>` pointing at a symbol the sprite does not carry · a fragment referencing the sprite externally or a template referencing it bare · a sprite out of step with `icons.mjs` | whether the symbol DRAWS what its name says — that is `check-glyphs` |
| `check-glyphs.mjs` | a sprite symbol whose geometry is not the glyph its name claims, compared against `@carbon/icons` via the `docs/carbon-glyphs.json` snapshot · a symbol name Carbon has no file for | **which slot** a glyph belongs in — that is `check-slots` |
| `check-slots.mjs` | the WRONG GLYPH in a slot, against `docs/carbon-slots.json` — 33 slots, each backed by 3+ stories or 3+ sibling slots agreeing | 11 slots have no Carbon capture that can answer (reported UNCOVERED, never passed) · 25 more are captured but under the corroboration bar |
| `check-compound.mjs` | two classes Carbon compounds, split across elements | wrong nesting order · missing wrapper |
| `check-tags.mjs` | a class on a different element type than Carbon renders it on | classes no story emits (81 today) |
| `check-ancestry.mjs` | a wrapper Carbon renders in **every** capture, absent here | a wrapper Carbon only sometimes renders |
| `check-coverage.mjs` | a component exercising fewer classes than `docs/coverage.json` records | standing still — it ratchets, it does not set a floor |
| `check-co-classes.mjs` | a modifier used without the base class that styles it | a base class Carbon never pairs |
| `check-inventory.mjs` | a component Carbon ships that `docs/inventory.md` has no row for · a row carrying no disposition · a component `src/app.scss` does not list at all · a disposition the manifest contradicts · **a stub in `sink/deferred/` shadowing a fragment that ships** | whether a disposition is RIGHT — it insists one was made, not that it was wise · whether a stub still deferred is still ACCURATE, which no gate reads |
| `check-headings.mjs` | a page with no heading at all · more than one `h1` · an outline that skips a level. Pages only — `sink/*.html` fragments are specimens, not documents | whether a heading says anything useful · a heading that looks like one and is marked up as a `div` |
| `check-aria-roles.mjs` | a `role` on a `rux--` class Carbon never renders that role on — the first gate to read the captures' attribute data | a role on an unclassed element · a MISSING role · whether required child roles exist · anything turning on `aria-live`, which the extractor does not record |
| `check-blocks.mjs` | a BLOCK or SLOT marker that does not pair, sits above PROVENANCE, encloses a `ks-` class or an inline style, or references an id outside its own region · a `builder/blocks.json` disagreeing with its sources in ANY field, in order, or by a duplicate or a missing template record · a `docs/builder-coverage.md` whose table has drifted, or whose eligibility notes name a fragment that is gone, is already marked, or is named twice · a `builder/guide.json` naming a block or slot that does not exist, leaving a template with no purpose line, recommending a variant value the group refuses, or suggesting a placement whose recorded layout does not match the slot **without saying what is unverified** | whether the marked region is the RIGHT part of the fragment, and whether an unmarked fragment SHOULD be marked — both are readings · **whether a suggestion is good**: it checks the map agrees with the catalogue, never that the advice is sound |
| `check-provenance.mjs` | a fragment that does not say where its markup came from · a template that does not say what its BEHAVIOUR was verified against, with a URL and a date | whether either label is true |
| `check-rendered.js` | default browser chrome · collapsed · escaped elements | anything it has no rule for · a section it has nothing to measure in |
| `check-runtime-classes.js` | a class in the markup that no longer exists once the modules have run — what `check-coverage` counts and nobody sees | anything behind an interaction; it is load-time only |
| `check-spacing.js` | a box property that disagrees with what Carbon computes for the same class set, read from `docs/carbon-react-spacing.json`, reported as **known vs unknown** against an adjudicated list | whether the value is RIGHT — only whether it matches Carbon; a class set neither side renders; and it cannot express POSITION, so a `:last-of-type` element measured against a recorded non-last one is a sampling artifact, not a disagreement |
| `check-behaviour.js` | a behaviour module that stops doing what its own header claims — the state a click produces | anything landing in a microtask: focus destination, focus restoration, the order two surfaces close in |
| `check-a11y.js` | dangling idrefs · composites with many tab stops · unnamed controls · roles missing required state | what a screen reader announces · focus-ring contrast · whether the tab order makes sense · **an ARIA role Carbon never renders** · **a page carrying no heading at all** |

The five browser gates run from the served page's console; `docs/verbs.md`
has the one-liner.
**None of them catches a component that compiles, resolves, and still renders wrong.**
Only looking does. That is why the kitchen sink exists, and why every change ends by
looking at it.
