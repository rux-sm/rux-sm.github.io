# rux-ds

A framework-free UI kit built from Carbon v11, compiled under the `rux` prefix,
that rux's apps use as static CSS, HTML and JS. Public. Published at
https://rux-sm.github.io/rux-ds/ and listed in the app switcher as "Design
System"; the site serves the working tree, not a tag.

**An agent starts at `AGENTS.md`** — the policy. This file is the current state,
how to work, and where things are. `docs/roadmap.md` holds the decisions and the
open proposals; `docs/log.md` holds every dated pass and measurement. Counts live
in `npm run gates` and `portal.html`, never in prose. Anything dated that used to
sit here has moved to the log — twice now, 2026-09-02 and 2026-09-09 — because a
README that narrates its own history goes stale, and this one did.

## Picking this up

**2026-09-10.** Clean tree. `npm run verify` exits 0; `npm run gates` reads every
cell current. **A twelfth template landed today**, `search-results-page`, and
finishing it cost a control change and one real defect — `docs/log.md` has the
account.

**`main` may be ahead of what is published.** This site deploys on a tag, after
checking every served app against it (roadmap §8.4 diff B, §8.6).
`git describe --tags` says how far.

**Nothing vendors rux-ds anywhere.** The scheduler, the hub, Notes and every
page `tools/new-project.sh` writes all link `/rux-ds/` live; no `vendor/`
directory exists in the family, there is no pin to move, and §8.4 has no step
left. The dated account of how that happened is in the log, not here.

Where the phases stand — the long form is in the log:

| | |
|---|---|
| Carbon compiled under `rux`, stripped to the keep-set (Phase 3) | done |
| Devendoring Carbon (Phase 4) | declined while admissions are open — roadmap §4.4 |
| Behaviour modules in `js/` (Phase 5) | all written; the exit criterion is a screen-reader pass by a person, `docs/screen-reader-pass.md` |
| Templates (6), the component index (7), the app scaffold (9–11) | done — `portal.html` counts them |
| The page builder, `builder.html` (12) | stage 12 of 13; stage 13, repeated items, is marked v2 |
| Theme Creator, surface overlays, saved themes (14–16) | landed 2026-09-06 |
| The Theme Creator rebuilt as one list (Phase 17) | landed 2026-09-10 — all 311 colour tokens, three detail levels, a theme file to download and load back |

### Open decisions — rux's

| What | Where |
|---|---|
| Published themes: a theme saved in the Theme Creator reaches every app on push | roadmap §8.5 — **required, not implemented** |
| Two screen-reader tasks: flip a toggle; open a modal and a popover | `docs/screen-reader-pass.md` |
| Whether `templates/settings-page.html`'s `col-span-4/8/8` is deliberate | the template, with `/account/` on the hub as a second reference |
| Builder stage 13, repeated items | `docs/builder-guided-plan.md` |
| Whether `--rux-border-strong-01` keeps 3:1 in every theme shipped, or only in the four compiled | `SEND-DS-2.md` in rux-ln-notes, read in place — measured on this repository's own `kitchen-sink.html` |

The last row is what another app still needs. Since 2026-09-12 that is done
here directly, in the same session, and the one list across the family is
the hub's `docs/status.md`. The four rows above it are this repository's own
decisions.

## Run, edit, verify, release

The full routine, with what to look at afterwards, is `docs/verbs.md`.

| Task | Command | Then |
|---|---|---|
| Run | `npm run serve` from the repository root → `http://localhost:8640/rux-ds/` — every app on one origin, the switcher filled from the hub's list | open the sink, the portal, a template |
| Edit a page | skill `rux-ds-page`: copy the nearest `templates/*.html` | `node tools/diff-fragment.mjs <name>` against the captures |
| Edit a colour or token value | `css/rux-theme.css`, inside a `[data-theme]` block | |
| Edit how a component looks | `css/rux-overrides.css`, at Carbon's own specificity | |
| Edit which components or themes compile | `src/app.scss` | `npm run build` |
| Verify | `npm run verify` — **check the exit code, not the output** | the browser gates: skill `sink-check`; `npm run gates` says which page each was last run against |
| Release | none of its own since 2026-09-12: `npm run verify`, commit, and a push to the repository's `main` publishes the design system with every app that uses it | a class that left fails the app's check in the same push |

**`npm install --ignore-scripts` before `npm run verify`, after any pull that
touches `package.json`** — `npm ci --ignore-scripts` on a fresh clone. `verify`
rebuilds `css/` from whatever Carbon is in `node_modules` and never checks that
against the pin, so a stale install rewrites the committed stylesheet from the
old Carbon and exits 0. The log has the day that happened.

### More commands

| | |
|---|---|
| `npm run build` | `src/app.scss` → `css/rux.css` + `.min.css`, verifies zero `cds` |
| `npm run sink` | assembles `sink/*.html` → `kitchen-sink.html` |
| `npm run icons` | quarries `assets/icons.svg` from `@carbon/icons` |
| `npm run inventory` | per-component classes and size → `docs/inventory.json` |
| `tools/extract/` | quarries Carbon's rendered markup → `docs/carbon-co-classes.json`, `docs/carbon-*-dom.json`, and — via the state recipes in `react-dom.js` — `docs/carbon-react-states.json` (roadmap §4.1.7, §4.1.14). Its `spacing` mode captures COMPUTED box properties instead, folded into a signature table — the one question the markup captures cannot answer |
| `tools/check-icons.mjs --unused` | the sprite's symbols nothing in the shipped sink references; `--deferred` is the ones `sink/deferred/` would need back |
| `tools/check-provenance.mjs --inferred` | the fragments whose markup was never diffed against a reference (roadmap §4.1.13) |
| `tools/diff-fragment.mjs <name> --omissions` | where a fragment's nesting disagrees with Carbon, and what Carbon renders that it omits |
| `npm run serve` | kitchen sink at `http://localhost:8642` |
| `npm run serve:workspace` | every site on one origin at `http://localhost:8640`, laid out as the live sites are: `/` the hub, `/rux-ds/`, `/rux-scheduler/`, `/rux-ln-notes/` |
| `npm run watch` | rebuild CSS on change |

## Figures

**Current figures are generated, not typed.** The table below is rewritten on
every `npm run verify`; `portal.html` is the component set and `npm run gates`
the browser sweep. The two capture-backed gates print this, re-measured
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
| Behaviour JS | **18** modules · **59 KB gzipped** · 195.8 KB raw, 62% of it comment · 74.1 KB of code |

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
| `src/app.scss` | the build manifest — which components and themes compile, under which prefix. Roadmap §4.3 |
| `css/` | build output, generated and committed: `rux.css`, `rux.min.css`, and the two files every page links after them — `rux-theme.css` (token values) and `rux-overrides.css` (component rules) |
| `js/` | the behaviour layer; `overlay.js` is the kernel and loads first. Roadmap §4.5 |
| `templates/` | complete pages, shell included; copy the nearest one. Roadmap §4.6 |
| `sink/` | one markup fragment per component, plus `ORDER`, `harness.css`, `harness.js` |
| `kitchen-sink.html` · `portal.html` · `builder.html` · `theme-creator.html` | generated — edit `sink/`, `docs/component-docs.json`, `builder/` or `theme-creator/` and rebuild |
| `index.html` | the site's home page, hand-authored — the only root page that is not generated |
| `builder/` | the page builder's behaviour and data; `rewrites.mjs` is the one place a template becomes a page. Roadmap §4.12 |
| `theme-creator/` | the Theme Creator's behaviour, contrast maths and hue families. Roadmap §4.14 |
| `assets/icons.svg` | the sprite, generated by `npm run icons`, inlined by every page |
| `assets/fonts/` | IBM Plex, self-hosted and opt-in via `plex.css`; OFL-1.1 |
| `brand/` | `logo.svg` and `favicon.svg`, hand-owned; swap the file and every shell follows. `brand/README.md` has the sizes |
| `assets/brand/` | two app icons generated from the logo by `npm run marks`, never hand-edited |
| `tools/` | every build and check script; `serve.mjs` serves, and from the repository root serves the whole site. `new-project.sh` and `app-skeleton/` stay because `check-parity` reads them; a new app is a folder beside this one, not a new repository |
| `tools/lib/gates.mjs` | the gate registry and `CONTROL_FILES` — tier 2 |
| `docs/*.md` | `roadmap.md` decisions · `log.md` the record · `verbs.md` the routine · `choices.md` what an app may choose · `starting-a-project.md` · `verifying-templates.md` · `composing-pages.md` · `screen-reader-pass.md` · `inventory.md` every component's disposition · `audits.md` · `commits.md` |
| `docs/*.json` | the Carbon captures and expected results the gates compare against — `carbon-*.json`, `coverage.json`, `inventory.json`, `gate-coverage.json`, `token-values.json`. Written by `tools/extract/` and the build; controls, never hand-edited |
| `docs/operating-card.html` · `docs/rux.code-workspace` | the printable card for rux, and the VS Code workspace seed it tells you to copy to `~/Developer` |
| `reference/` · `docs/adoption-audit.md` | material about agent tooling, not about the kit; nothing reads it |
| `CHANGES.md` | a class or component that left, one line each — the only thing a pin cannot tell a consumer |
| `LICENSE` · `NOTICE` | Apache-2.0; `NOTICE` names each artefact carrying Carbon-derived material |
| `carbon-website/` | gitignored quarry of Carbon's docs; read from, never shipped |

## The one rule

**No Carbon file is ever edited.** Customisation is `$prefix`, Carbon's own config
flags, which components and themes compile, and the two files above the build.
One documented exception, enforced on every build: `tools/build.mjs` renames
`--cds-grid-*`, which Carbon hardcodes past `$prefix`. Roadmap §1.1 and §4.1.2.

## Gates

None is sufficient alone — roadmap §4.1.2 has the bug that proved it — and `npm run gates` prints how many there are and which page each has been run against.

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
| `check-parity.mjs` | `builder/rewrites.mjs`'s `exportPage` disagreeing with the page-writing lines of `tools/new-project.sh`, for any of the ten templates and any of four answer sets, the fourth being the only one that asks for `--grid full` · a substitution added to or removed from the script · the extracted region no longer being findable, which faults rather than passing | everything the script does outside those lines — the vendored tree, the PIN, the questions, the drift report · and **whether either side produces valid HTML**: neither escapes the answers, so a name carrying `" < > &` makes markup both sides agree on byte for byte and no browser reads as intended |
| `check-provenance.mjs` | a fragment that does not say where its markup came from · a template that does not say what its BEHAVIOUR was verified against, with a URL and a date | whether either label is true |
| `check-rendered.js` | default browser chrome · collapsed · escaped elements | anything it has no rule for · a section it has nothing to measure in |
| `check-runtime-classes.js` | a class in the markup that no longer exists once the modules have run — what `check-coverage` counts and nobody sees | anything behind an interaction; it is load-time only |
| `check-spacing.js` | a box property that disagrees with what Carbon computes for the same class set, read from `docs/carbon-react-spacing.json`, reported as **known vs unknown** against an adjudicated list | whether the value is RIGHT — only whether it matches Carbon; a class set neither side renders; and it cannot express POSITION, so a `:last-of-type` element measured against a recorded non-last one is a sampling artifact, not a disagreement |
| `check-behaviour.js` | a behaviour module that stops doing what its own header claims — the state a click produces | anything landing in a microtask: focus destination, focus restoration, the order two surfaces close in |
| `check-a11y.js` | dangling idrefs · composites with many tab stops · unnamed controls · roles missing required state | what a screen reader announces · focus-ring contrast · whether the tab order makes sense · **an ARIA role Carbon never renders** · **a page carrying no heading at all** |

`npm run gates` prints how many gates run in `npm run verify` and how many need a
browser, and which page each browser gate has been run against; the `sink-check`
skill runs the browser ones. Every gate's history — what it was written after, what
its first run found, what was adjudicated and why — is in `docs/log.md`, "Gates".
**None of them catches a component that compiles, resolves, and still renders wrong.**
Only looking does. That is why the kitchen sink exists, and why every phase ends by
looking at it — twice now it has been the only thing that found the bug (roadmap §4.1.2,
§4.1.5).
