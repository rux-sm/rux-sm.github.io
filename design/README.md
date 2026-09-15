# Design

A framework-free UI kit built from Carbon v11, compiled under the `rux` prefix,
that rux's apps use as static CSS, HTML and JS. Published at
https://rux-sm.github.io/design/ and listed in the app switcher as "Design
System".

The repository's `AGENTS.md` is the policy. Open work is in the site's
`docs/status.md`, and counts live in `portal.html`.

## Picking this up

**`main` is what is published.** Design is a folder of the site repository,
and a push to `main` deploys it with every app after CI runs the full check.

**Every app links `/design/` live** from the same repository, with no copy.

**Carbon stays installed** in `node_modules` while components are still being
admitted.

**What ships:** the compiled components, the behaviour modules, the templates,
the component index, the page builder and the Theme Creator.

## Run, edit, verify

The full routine, with what to look at afterwards, is `docs/verbs.md`.

| Task | Command | Then |
|---|---|---|
| Run | `npm run serve` from the repository root, then `http://localhost:8640/design/` | open the sink, the portal, a template |
| Edit a page | skill `design-page`: copy the nearest `templates/*.html` | `node tools/diff-fragment.mjs <name>` against the captures |
| Edit a colour or token value | `css/rux-theme.css`, inside a `[data-theme]` block | |
| Edit how a component looks | `css/rux-overrides.css`, at Carbon's own specificity | |
| Edit which components or themes compile | `src/app.scss` | `npm run build` |
| Verify | `npm run verify`, and **check the exit code, not the output** | the five browser gates, from the served page's console, in `docs/verbs.md` |
| Publish | `npm run verify`, commit, and push to `main` | a class that left fails the app's check in the same push |

**Run `npm install --ignore-scripts` before `npm run verify` after any pull
that touches `package.json`**, or `npm ci --ignore-scripts` on a fresh clone.
`verify` rebuilds `css/` from whatever Carbon is installed, so a stale install
rewrites the committed stylesheet from the old Carbon and still exits 0.

### More commands

| | |
|---|---|
| `npm run build` | `src/app.scss` → `css/rux.css` + `.min.css`, verifies zero `cds` |
| `npm run generate` | rebuilds every generated page and file: the kitchen sink, portal, README figures, builder, Theme Creator and shell |
| `npm run icons` | quarries `assets/icons.svg` from `@carbon/icons` |
| `npm run inventory` | per-component classes and size → `data/inventory.json` |
| `tools/extract/` | quarries Carbon's rendered markup → `data/carbon-co-classes.json`, `data/carbon-*-dom.json`, and — via the state recipes in `react-dom.js` — `data/carbon-react-states.json`. Its `spacing` mode captures COMPUTED box properties instead, folded into a signature table — the one question the markup captures cannot answer |
| `tools/check-icons.mjs --unused` | the sprite's symbols nothing in the shipped sink references; `--deferred` is the ones `sink/deferred/` would need back |
| `tools/check-provenance.mjs --inferred` | the fragments whose markup was never diffed against a reference |
| `tools/diff-fragment.mjs <name> --omissions` | where a fragment's nesting disagrees with Carbon, and what Carbon renders that it omits |
| `npm run watch` | rebuild CSS on change |

## Figures

The table is generated on every `npm run verify`. Do not edit it by hand.

<!-- STATS:BEGIN -->
| | |
|---|---|
| Components | **77 / 83 compiled** in 80 `@use` lines — `data-table` is four of them — and `docs/inventory.md` decides all 83, which `check-inventory` fails if it stops |
| Themes | 4 — white, g10, g90, g100 — plus `geist`, `linear`, `ant-dark` and `spotify`, token override blocks in `css/rux-theme.css`, not a compile |
| Tokens · classes | **626** `--rux-*` defined, 10 more read through a fallback · **1,798** `.rux--*` |
| Kitchen sink | **68** sections · **994** classes with `templates/` and `js/` |
| Class coverage | **948 / 1,356 (70%)** — ratcheted in `data/coverage.json` |
| Spacing scale | 13 `--rux-spacing-*` tokens, demoed in the `spacing` section |
| Markup provenance | **74 `rendered-dom` · 6 `source` · 0 `inferred`** across 80 files |
| Icons | 70 symbols in a 20.0 KB sprite — 51 referenced, 19 nothing points at |
| Size | 1023.9 KB raw · 920.9 KB min · **91 KB gzipped** |
| Behaviour JS | **18** modules · **62 KB gzipped** · 206.2 KB raw, 61% of it comment · 81.2 KB of code |

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
| `kitchen-sink.html` · `portal.html` · `builder.html` · `theme-creator.html` | generated — edit `sink/`, `data/component-docs.json`, `builder/` or `theme-creator/` and rebuild |
| `index.html` | the site's home page, hand-authored — the only root page that is not generated |
| `builder/` | the page builder's behaviour and data; `rewrites.mjs` is the one place a template becomes a page. |
| `theme-creator/` | the Theme Creator's behaviour, contrast maths and hue families. |
| `assets/icons.svg` | the sprite, generated by `npm run icons`, inlined by every page |
| `assets/fonts/` | IBM Plex, self-hosted and opt-in via `plex.css`; OFL-1.1 |
| `brand/` | `logo.svg`, `favicon.svg` and `icon.svg`, the app tile icon; swap a file and every page follows |
| `tools/` | every build and check script; `serve.mjs` serves, and from the repository root serves the whole site |
| `tools/lib/gates.mjs` | the gate registry: what each gate catches and is blind to, rendered into `portal.html` |
| `docs/*.md` | `verbs.md` the routine · `choices.md` what an app may choose · `verifying-templates.md` · `composing-pages.md` · `screen-reader-pass.md` · `inventory.md` every component's disposition · `builder-coverage.md` the builder's catalogue · `agent-tooling.md` the maintenance instruments |
| `data/*.json` | the Carbon captures and expected results the gates compare against — `carbon-*.json`, `coverage.json`, `inventory.json`, `token-values.json`. Written by `tools/extract/` and the build; controls, never hand-edited |
| `LICENSE` · `NOTICE` | Apache-2.0; `NOTICE` names each artefact carrying Carbon-derived material |
| `carbon-website/` | gitignored quarry of Carbon's docs; read from, never shipped |

## The one rule

**No Carbon file is ever edited.** Customisation is `$prefix`, Carbon's own config
flags, which components and themes compile, and the two files above the build.
One documented exception, enforced on every build: `tools/build.mjs` renames
`--cds-grid-*`, which Carbon hardcodes past `$prefix`.

## Gates

`tools/lib/gates.mjs` is the gate registry: what each gate catches and what it
is blind to, shown on `portal.html`. None is sufficient alone, and **none
catches a component that compiles, resolves and still renders wrong.** Only
looking does, which is why every change ends by opening the kitchen sink.
