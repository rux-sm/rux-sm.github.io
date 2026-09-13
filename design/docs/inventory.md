---
type: reference
---

# Inventory

Every component Carbon ships, with what it costs, what it drags in, and a
disposition: **KEEP**, **DEFER** or **CUT**. This is a decision document, kept by
hand. Regenerating it from `data/inventory.json` would overwrite the decisions.

The rules that hold it together:

- **Every component has a row.** `tools/check-inventory.mjs` fails on a component
  Carbon ships with no row, a row Carbon no longer ships, and a row with no decided
  disposition. It prints the current tally; this file keeps none.
- **Every component has a line in `src/app.scss`.** KEEP is a live `@use`; CUT and
  DEFER are a commented one. A component with no line can be neither kept nor cut, so
  the check fails on it too.
- **A component is admitted when a Carbon capture renders it.** DEFER means the
  capture is missing or does not match the classes `@carbon/styles` ships. CUT gives
  its own reason in the row.
- **Cost decides no disposition.** Every component measured adds under 3.5 KB gzipped
  to the shipped set.
- **An evidence reason can expire.** Nothing re-reads a row's ground when Carbon
  changes, so a CUT row is re-checked when a Carbon upgrade lands.

Four directories are PascalCase — `EditInPlace`, `FullPageError`,
`InterstitialScreen`, `OptionsTile` — so a name pattern must admit capitals.

---

## What a component actually costs

Per-component sizes cannot be added up, because every component drags its transitive
`@use` graph and those graphs overlap. Summed, they overcount a real bundle about four
times. `tools/measure.mjs` prices a real subset by compiling it.

| Configuration | Minified | **Gzipped** | Classes |
|---|---|---|---|
| Foundation only (reset, type, grid, layout, tokens) — 1 theme | 51 KB | **6.6 KB** | — |
| Foundation only — 2 themes | 71 KB | **7.9 KB** | — |
| Lean — 22 components, 2 themes | 375 KB | **~39 KB** | see note |
| **Shipped — 36 components / 39 modules, 2 themes** | 586 KB | **59.4 KB** | 1,237 |
| Shipped set — 4 themes | 631 KB | **60.2 KB** | 1,237 |
| Full Carbon — 83 components / 87 modules, 4 themes | 939 KB | **94.0 KB** | 1,862 |

> The Shipped and Full Carbon rows were measured on 2026-08-31, before the admissions
> of 2026-09-01, so the shipped set is now larger than this row. Run
> `node tools/measure.mjs` for a current figure. The Shipped row matches
> `css/rux.min.css` apart from the 599-byte attribution banner `build.mjs` prepends.
>
> The Foundation rows are older and understated by roughly the cost of
> `type.type-classes`; `measure.mjs` has no zero-component mode to re-measure them.
> The Lean row's component list was never recorded, so it cannot be recompiled.
>
> `measure.mjs` reads the themes, the emit includes and the component modules from
> `src/app.scss`, so it prices what ships. A component can be several modules:
> `data-table` is a base plus `sort`, `expandable` and `action`.
>
> Classes are counted by the one pattern in `tools/lib/ownership.mjs`; a pseudo-class
> is not a separate class.

**A theme is almost free on the wire.** A theme is the same token names with different
values, so it compresses against the first one. Choose themes on scope and testing
surface, not on size.

**The KB column in the tables below is standalone-with-dependencies.** It overstates
every component that shares dependencies with the shipped set, often ten to a hundred
times: `content-switcher` reads 93 KB and adds +1.7 KB gzipped. Argue a row on its
marginal cost, measured by compiling it on top of the shipped set.

---

## The dependency core

These components are depended on by others, so they are kept by structure rather than by
choice. `button` pulls `tooltip`, which pulls `popover`, so anything interactive drags all
three.

| Component | Needed by | Note |
|---|---|---|
| `popover` | 37 | kept |
| `tooltip` | 36 | kept |
| `button` | 35 | kept |
| `form` | 28 | kept |
| `text-input` | 13 | kept |
| `tag` | 7 | kept |
| `list-box` | 6 | kept |
| `select` | 4 | kept |
| `checkbox` | 3 | kept |
| `dropdown` | 3 | kept |
| `fluid-list-box` | 3 | kept |

A cut only reclaims weight when **everything** above a component goes with it.

---

## Components

"Needed by" counts other components that `@use` it transitively.

| Component | Disposition | KB | Classes | Needed by | Reason |
|---|---|---|---|---|---|
| `ui-shell` | **KEEP** | 113 | 253 | 0 | the app shell shape; no substitute in the set |
| `notification` | **KEEP** | 108 | 240 | 0 | error and empty states |
| `pagination` | **KEEP** | 99 | 275 | 0 | table page |
| `dropdown` | **KEEP** | 93 | 281 | 3 | form page and table filters |
| `breadcrumb` | **KEEP** | 87 | 238 | 0 | detail page |
| `modal` | **KEEP** | 82 | 236 | 0 | the overlay shape |
| `list-box` | **KEEP** | 81 | 241 | 6 | forced by dropdown |
| `overflow-menu` | **KEEP** | 78 | 203 | 2 | row actions in the table page |
| `tabs` | **KEEP** | 76 | 186 | 0 | detail page |
| `button` | **KEEP** | 69 | 164 | 35 | every interactive shape needs it; 35 components depend on it |
| `data-table` | **KEEP** | 59 | 210 | 0 | the table page shape · four modules: base, `sort`, `expandable`, `action`. `data-table/skeleton` is not compiled, because `skeleton-styles` ships the loading treatment |
| `tooltip` | **KEEP** | 50 | 89 | 36 | forced — 36 dependents, and button pulls it |
| `popover` | **KEEP** | 48 | 81 | 37 | forced — 37 dependents; the positioning primitive under tooltip and menu |
| `search` | **KEEP** | 43 | 155 | 1 | table page |
| `text-input` | **KEEP** | 34 | 120 | 13 | form page; 13 dependents |
| `number-input` | **KEEP** | 31 | 97 | 1 | form page |
| `checkbox` | **KEEP** | 25 | 97 | 3 | form page; data-table selection depends on it |
| `select` | **KEEP** | 24 | 92 | 4 | form page; 4 dependents |
| `radio-button` | **KEEP** | 22 | 88 | 1 | form page; data-table selection depends on it |
| `tile` | **KEEP** | 21 | 64 | 0 | detail page and dashboards |
| `text-area` | **KEEP** | 20 | 81 | 1 | form page |
| `tag` | **KEEP** | 19 | 61 | 7 | status column in the table page; 7 dependents |
| `form` | **KEEP** | 14 | 52 | 28 | forced — 28 dependents; the form page is a target shape |
| `accordion` | **KEEP** | 12 | 39 | 0 | detail page |
| `inline-loading` | **KEEP** | 8 | 21 | 0 | in-place pending state for form submits |
| `menu` | **KEEP** | 8 | 31 | 2 | row and overflow actions |
| `toggle` | **KEEP** | 7 | 27 | 0 | form page |
| `loading` | **KEEP** | 6 | 12 | 2 | loading states; inline-loading depends on it |
| `skeleton-styles` | **KEEP** | 4 | 22 | 0 | loading states, 4 KB |
| `link` | **KEEP** | 4 | 17 | 1 | unavoidable, 4 KB |
| `list` | **KEEP** | 2 | 9 | 0 | unavoidable, 2 KB |
| `multiselect` | **KEEP** | 97 | 291 | 1 | a capture renders it; +0.6 KB gzipped |
| `file-uploader` | **KEEP** | 91 | 258 | 0 | a capture renders it; +1.1 KB gzipped |
| `combo-box` | **KEEP** | 83 | 249 | 0 | a capture renders it; +0.2 KB gzipped |
| `progress-indicator` | **KEEP** | 76 | 196 | 0 | the wizard page shape needs it; a hand-composed step list is the wrong component. +0.9 KB gzipped |
| `toggletip` | **KEEP** | 71 | 173 | 2 | a `popover-container` plus `toggletip`, `toggletip-button` and `toggletip-content`. **No module:** `js/popover.js` already opens `.rux--popover-container` on click and keeps `aria-expanded` in step. +0.2 KB gzipped |
| `time-picker` | **KEEP** | 47 | 167 | 0 | a separate decision from date-picker: `time-picker__input-field` over `text-input` plus two native `<select>`s, all compiled, so **no calendar, no popover and no module**. +0.4 KB gzipped |
| `slider` | **KEEP** | 45 | 176 | 0 | a capture renders it; +1.4 KB gzipped |
| `date-picker` | **KEEP** | 43 | 120 | 1 | `templates/schedule-page.html` needs it. **This is Carbon's `--next` date picker** (`preview-preview-datepicker--*`): days are real `<button type=button>`, the calendar is `role=grid`, and its rules key on Carbon's own classes. The classic one (`components-datepicker--*`) draws its calendar through flatpickr, which is not shipped; its capture hides that, because `react-dom.js` keeps only `cds--` classes. The `--next` stories are captured with the calendar open (`*-with-calendar@open`). `js/date-picker.js` is its module. **The day state classes are unprefixed** — `selected`, `today`, `inRange`, `prevMonthDay`, `nextMonthDay`, `disabled`, `focused` — so no capture records them and no gate checks them. +3.4 KB gzipped |
| `treeview` | **KEEP** | 20 | 86 | 0 | a capture renders it; +0.7 KB gzipped |
| `progress-bar` | **KEEP** | 8 | 21 | 0 | a capture renders it; +0.6 KB gzipped |
| `icon-indicator` | **KEEP** | 3 | 18 | 1 | two captures render it; +0.4 KB gzipped |
| `action-set` | **KEEP** | 2 | 19 | 0 | every side-panel capture renders it as the actions container; +0.3 KB gzipped |
| `shape-indicator` | **KEEP** | 2 | 17 | 0 | two captures render it; +0.3 KB gzipped |
| `aspect-ratio` | **KEEP** | 1 | 12 | 0 | a capture renders it; +0.1 KB gzipped |
| `stack` | **KEEP** | 1 | 15 | 1 | vertical rhythm for forms. Carbon spaces a form from the container (`display: grid`, `row-gap`) and zeroes its controls' margins, so a margin-based stand-in cannot work |
| `badge-indicator` | **KEEP** | 1 | 2 | 0 | the unread count on the shell's Notifications button. Carbon renders it only as the last child of an icon-only button, which supplies its containing block. +0.1 KB gzipped |
| `fluid-multiselect` | **KEEP** | 124 | 362 | 0 | fluid style of `multiselect`, admitted with its base |
| `fluid-combo-box` | **KEEP** | 107 | 307 | 1 | fluid style of `combo-box`, admitted with its base |
| `fluid-dropdown` | **KEEP** | 107 | 307 | 0 | fluid style (see below). **Compiled and not demoed:** its fluid form is the default markup plus the fluid wrapper, so a specimen would repeat a section the sink already carries |
| `ai-label` | **KEEP** | 99 | 242 | 0 | a capture renders it |
| `slug` | **DEFER** | 99 | 242 | 1 | compiles as `ai-label`'s paired selectors, but no story renders the `slug` classes themselves. A missing capture, not a rejection |
| `content-switcher` | **KEEP** | 93 | 220 | 0 | a capture renders it; +1.7 KB gzipped |
| `code-snippet` | **KEEP** | 86 | 211 | 0 | a capture renders it |
| `contained-list` | **KEEP** | 86 | 232 | 0 | a capture renders it |
| `dialog` | **KEEP** | 76 | 185 | 0 | a capture renders it |
| `pagination-nav` | **KEEP** | 74 | 188 | 0 | a capture renders it |
| `combo-button` | **KEEP** | 74 | 201 | 0 | a primary action and a menu trigger in one container. **No module:** the menu is portaled, so `js/menu.js` claims the trigger through `data-rux-open` and sets the container's `--open`. **Two attested classes are not written:** `btn--lg` has no rule (large comes from `layout--size-lg`) and `combo-button__bottom` is in no SCSS. +0.12 KB gzipped |
| `menu-button` | **KEEP** | 73 | 195 | 0 | a capture renders it |
| `copy-button` | **KEEP** | 72 | 177 | 1 | a standalone icon button with its own module. **The feedback is the tooltip, not `copy-btn__feedback`**, which has rules but appears in zero captures. Carbon's copied state adds only `copy-btn--animating` and `copy-btn--fade-in`, and the word comes from the tooltip's text, so this fragment keeps the icon-tooltip chrome the sink declines elsewhere. `snippet__icon` and `popover--auto-align` are not written. +0.44 KB gzipped |
| `chat-button` | **KEEP** | 70 | 174 | 0 | a capture renders it |
| `fluid-time-picker` | **KEEP** | 60 | 182 | 0 | fluid style (see below). **Compiled and not demoed**, like `fluid-dropdown` |
| `fluid-date-picker` | **KEEP** | 54 | 139 | 0 | fluid style (see below). **Compiled and not demoed**, like `fluid-dropdown` |
| `fluid-search` | **KEEP** | 45 | 163 | 0 | fluid style (see below); demoed in `sink/fluid.html` |
| `fluid-number-input` | **KEEP** | 43 | 113 | 0 | fluid style (see below); demoed in `sink/fluid.html` |
| `fluid-text-input` | **KEEP** | 40 | 126 | 1 | fluid style (see below); demoed in `sink/fluid.html` |
| `fluid-select` | **KEEP** | 29 | 101 | 1 | fluid style (see below); demoed in `sink/fluid.html` |
| `fluid-text-area` | **KEEP** | 26 | 94 | 0 | fluid style (see below); demoed in `sink/fluid.html` |
| `side-panel` | **KEEP** | 19 | 86 | 0 | a capture renders it |
| `fluid-list-box` | **KEEP** | 14 | 62 | 3 | fluid style (see below). **Compiled and not demoed**, like `fluid-dropdown` |
| `structured-list` | **KEEP** | 11 | 31 | 0 | a capture renders it |
| `card` | **KEEP** | 9 | 56 | 0 | **the author's call, not a page shape's need:** no template requires a card and `tile` serves the container shape. Carbon ships it in `@carbon/styles` and renders it in the `preview-preview-card--*` stories. The media family is unexercised, because it needs an `<img>` the sink does not carry. +1.2 KB gzipped |
| `page-header` | **CUT** | 4 | 32 | 0 | deprecated upstream; an ibm-products component, not @carbon/react. The dashboard uses the title-stack idiom instead |
| `resizer` | **CUT** | 1 | 11 | 0 | no reference on either Storybook origin; 1 KB, niche |
| `truncated-text` | **CUT** | 1 | 5 | 0 | no reference, and its expand toggle has an unfixable button-reset gap |

**Fluid is a style, not a component.** The label moves inside the field and an `<hr>`
divider goes under it. IBM pairs it with the default style rather than replacing it. It
has one height, 64px, so there are no size variants to demo.

## Components absorbed from ibm-products

These arrived in `@carbon/styles` 1.114. `data/carbon-react-dom.json` renders none of
them; their markup comes from the ibm-products captures, and the status indicators'
from the React preview. Marginal is the cost compiled on top of the shipped set.

| Component | Disposition | KB | Classes | Marginal | Reason / evidence |
|---|---|---|---|---|---|
| `big-number` | **KEEP** | 4 | 19 | +0.3 KB | an ibm-products capture renders it. The captured `figure`/`figcaption`, second row at `role=math` and value span ship as a fragment; the uncaptured size, percentage, trend, tooltip and skeleton variants are not written |
| `coachmark` | **DEFER** | 6 | 31 | +0.9 KB | **a class mismatch, not a decision.** The captures render `coachmark__next--*`, `coachmark-beacon` and `coachmark-tagline` from ibm-products 2.97; `@carbon/styles` 1.114 ships `coachmark--*` without the `__next` generation. A fragment would either fail check-classes or match no capture. Admit on the Carbon upgrade that aligns the two |
| `EditInPlace` | **KEEP** | 3 | 27 | +0.5 KB | four ibm-products captures render it |
| `FullPageError` | **KEEP** | 2 | 10 | +0.2 KB | three ibm-products captures render it |
| `InterstitialScreen` | **CUT** | 4 | 21 | +0.4 KB | no template shape, and **incomplete**: it styles `cds--carousel`, and `@carbon/styles` 1.114.0 has no `carousel` component, so part of it can never resolve |
| `OptionsTile` | **KEEP** | 5 | 37 | +0.6 KB | two ibm-products captures render the expandable and static markup |
| `scroll-gradient` | **KEEP** | 2 | 9 | +0.2 KB | two ibm-products captures render the structure |
| `user-avatar` | **KEEP** | 5 | 28 | +0.5 KB | initials or a photo, four sizes, and twelve `--order-N-*` colours meant to be hashed from a name. The shell's `user--avatar` icon answers "where is my account", not "who is this". **No module.** **Its only captures render `c4p--`**, not `cds--`; five of six captured classes resolve after a prefix swap, and the sixth, `user-avatar__tooltip`, is ibm-products' hover chrome and is declined. The `__photo` family is unexercised, because it needs an `<img>` the sink does not carry. +0.68 KB gzipped |

---

## Reproducing the numbers

`tools/measure.mjs` compiles against `node_modules/@carbon`, so it needs Carbon
installed.

```bash
npm run inventory                 # per-component size, classes, @use graph, tokens
node tools/measure.mjs            # full vs proposed set, gzipped
node tools/measure.mjs --themes 1 button form popover tooltip   # any ad-hoc set
```
