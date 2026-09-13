# Phase 2 — Inventory

Every one of Carbon's components, with what it costs, what it drags in, and a
disposition. Roadmap §4.2 asks for exactly this and calls the exit "75 rows, every row
decided." **There were 75 when that was written; Carbon 1.114 ships 83.** The eight new
ones have rows as of 2026-08-31 but seven are still undecided, so the exit is not met —
see "The eight that arrived with Carbon 1.114".

**This is a decision document, not a generated one.** It was seeded from
`docs/inventory.json` and `tools/measure.mjs` on 2026-08-28, and is maintained by
hand from here. Regenerating it would overwrite the decisions, which are the point.

---

## What a component actually costs

Per-component sizes cannot be added up. Roadmap §2 measured the sum at 3,534 KB against a
real 837 KB bundle — a 4.2× overcount — because every component drags its transitive
`@use` graph and those graphs overlap. `tools/measure.mjs` exists to price a real subset
by compiling it. **Shipped and Full Carbon re-measured 2026-08-31**; the Foundation and
Lean rows still read 2026-08-28 and are understated — see the third note below.

| Configuration | Minified | **Gzipped** | Classes |
|---|---|---|---|
| Foundation only (reset, type, grid, layout, tokens) — 1 theme | 51 KB | **6.6 KB** | — |
| Foundation only — 2 themes | 71 KB | **7.9 KB** | — |
| Lean — 22 components, 2 themes | 375 KB | **~39 KB** | see note |
| **Shipped — 36 components / 39 modules, 2 themes** | 586 KB | **59.4 KB** | 1,237 |
| Shipped set — 4 themes | 631 KB | **60.2 KB** | 1,237 |
| Full Carbon — 83 components / 87 modules, 4 themes | 939 KB | **94.0 KB** | 1,862 |

> **THE SHIPPED ROW WAS UNDERSTATED, and the tool was the reason.** It read 548 KB /
> 56.3 KB / 1,128 classes against a real 582 KB / 1,225. `measure.mjs` built its
> synthetic stylesheet from a HARDCODED include list — `reset.reset` and
> `type.default-type` — and `src/app.scss` admitted `type.type-classes` at `4beac65`.
> The tool went on pricing a configuration this project does not ship, and the note
> below claiming its output "matches `css/rux.min.css` byte for byte" was false from
> that commit until 2026-08-31. A hardcoded include list is the same second copy the
> theme pair was, and failed the same way; it is now read from the manifest, and the
> shipped row matches the built artifact to the 599-byte attribution banner
> (59.4 KB here, 59.7 KB with the banner `build.mjs` prepends; the figures in this
> table were re-measured 2026-08-31 after `toggletip` and `time-picker` were admitted,
> and the relationship still holds).
>
> One symptom is worth naming because it was visible in this table all along: the
> 4-theme row read **1,112 classes against the 2-theme row's 1,128**. Themes cannot
> remove classes. Both read 1,225 once that was fixed, and 1,237 since `toggletip`
> and `time-picker` were admitted — the point is that they AGREE, not the figure.
>
> **CARBON 1.114 SHIPS 83 COMPONENTS, NOT 75, and eight of them have no row here.**
> `big-number`, `coachmark`, `EditInPlace`, `FullPageError`, `InterstitialScreen`,
> `OptionsTile`, `scroll-gradient` and `user-avatar` — names this project first met in
> the `ibm-products` captures, now absorbed into `@carbon/styles` itself. So the full
> baseline moved for TWO reasons at once, 881 → 939 KB: eight new components, and the
> type utilities the tool had been omitting. **This document's own exit criterion — "75
> rows, every row decided" — is no longer met at 83.** Those eight are undecided, and
> deciding them is not a measurement; nobody has made that call. Roadmap §4.2.
>
> **The Foundation and Lean rows were NOT re-measured.** Foundation has no mode in
> `measure.mjs` — the tool prices full, shipped, or an ad-hoc component list, and a
> zero-component set is none of those — so re-running it would have meant hand-rolling
> a second copy of the build path to measure the cost of a copy-drift bug, which is the
> joke telling itself. Both Foundation rows predate `type.type-classes` and are
> understated by roughly its cost. The Lean-22 row cannot be recompiled at all, for the
> reason already recorded below.

> **A COMPONENT CAN BE SEVERAL MODULES, and this table now counts both.** Carbon
> splits `data-table` into a base plus `sort`, `expandable` and `action`, and
> `@use`s them separately in its own `components/_index.scss`. The manifest took
> the base alone, so the shipped table could not sort, expand or batch-select —
> `table-sort` and `table-expand__button` had no rules at all, and `table-sort`
> passed check-classes only because it survives inside AI-qualified selectors.
> The sink found it by trying to demo sorting. All three were admitted on
> 2026-08-28 under roadmap §2.1's admission rule at **+26 KB minified / +2.9 KB
> gzipped**; `data-table/skeleton` was not, because skeleton-styles already
> ships the loading treatment. The full-Carbon baseline moved for the same
> reason — `tools/measure.mjs` was reading a directory listing, which cannot see
> a sub-module, and now reads Carbon's own `_index.scss`.
>
> **The gzipped column was re-measured 2026-08-28, after the Classes recount below.**
> `tools/measure.mjs` took the first N of `['white','g10','g90','g100']`, so every
> 2-theme figure priced **white + g10** — while `src/app.scss` has shipped **white +
> g100** since Phase 3 pass 3 chose "the furthest point from" white. g10 is a
> near-neighbour of white and compresses against it far better, so these rows ran
> ~1.3 KB optimistic for the configuration that actually ships. The tool now reads the
> pair from the manifest. Its output matched `css/rux.min.css` byte for byte when this
> was written and stopped doing so at `4beac65` — see the correction above the table.
> **The shipped floor is 52.7 KB gzipped, not 51.** Figures now carry one decimal:
> integer KB straddling a boundary made a 1.3 KB difference read as 2 KB.
>
> The Lean-22 row is `~39 KB` and `see note` because that row's component list was
> never recorded and cannot be recompiled; its gzip figure is the old measurement plus
> the correction, not a re-run.

> **The Classes column was recounted 2026-08-28.** It had been produced by a pattern
> that admitted a bare `:`, so `.rux--btn--xs:hover` counted as a class distinct from
> `.rux--btn--xs` and every pseudo-class inflated the total — 1,609 for a set that has
> 1,079, and 2,475 for one that has 1,611. Two other tools counted differently again
> (534 and 824, each wrong in its own way). The pattern now lives once, in
> `tools/lib/ownership.mjs`, and all three agree. **Sizes are unaffected** — only the
> count was wrong. The Lean-22 row reads `see note` because that row's component list
> was never recorded and cannot be recompiled.

Two findings fall out, and both change decisions.

**A theme is free on the wire.** The foundation costs 51 KB minified with one theme and
71 KB with two — and **7 KB gzipped either way**. Across the whole proposed set, going
from four themes to two saves 44 KB minified and 2 KB gzipped. A theme is the same ~600
token names with different values, so it compresses almost entirely against the first one.
**The 4 → 2 theme cut should be justified on scope and testing surface, not on size**, and
§4.3 currently lists it as a strip pass alongside components as though the two were
comparable. They are not.

**§2.1's ≤40 KB target was not reachable by a set that covers the target page shapes.**
22 components hit ~39 KB — and that set has no `ui-shell` and no `data-table`, so it
cannot build the app shell or the table page that Phase 6 exists to produce. Adding those
two plus `tabs` and `pagination` reaches ~48 KB; the shipped set is 52.7 KB. This finding
is what first put the target in question; §2.1 has since removed it entirely, for the
stronger reason recorded below.

> **Superseded 2026-08-28. This section recommended amending §2.1's target to ≤55 KB
> gzipped; §2.1 now has no KB target at all, and the reason is in this table.** The
> recommendation was sound against 40 and arbitrary in itself — 55 was the measured
> floor rounded up to the next multiple of five, and that floor was 1.3 KB understated.
> More decisively, **not one of the 6 CUT and DEFER rows below was decided on CSS
> bytes.** They were decided on overlap with something already shipping, on whether a
> named page shape needs the component, and on Phase 1 provenance. The nine rows that
> mention size mostly use it to argue something is *cheap enough to add back*; the one
> genuine cost cut, `toggletip`, was wrong by two orders of magnitude. A number that
> decided nothing, and had to be amended each time it was tested, was never the
> constraint. §2.1 now states the admission rule that was actually operating, and keeps
> the byte count as a reported measurement with a wide tripwire.

---

## The dependency core

Twelve components are depended on by others, so they are kept by structure rather than by
choice. `button` pulls `tooltip`, which pulls `popover`, which is why those three top the
list — anything interactive drags all three.

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
| `fluid-list-box` | 3 | cut — check its dependents go too |

A cut only reclaims weight when **everything** above a component goes with it. The
`fluid-*` family is the clean case: 11 components that nothing outside the family needs,
so cutting them as one decision reclaims all of it.

---

## The 75

Sorted KEEP, then DEFER, then CUT, each by size. "Needed by" counts other components that
`@use` it transitively.

| Component | Disposition | KB | Classes | Needed by | Reason |
|---|---|---|---|---|---|
| `ui-shell` | **KEEP** | 113 | 253 | 0 | the app shell shape; no substitute in the set |
| `notification` | **KEEP** | 108 | 240 | 0 | error and empty states |
| `pagination` | **KEEP** | 99 | 275 | 0 | table page |
| `dropdown` | **KEEP** | 93 | 281 | 3 | form page and table filters |
| `breadcrumb` | **KEEP** | 87 | 238 | 0 | detail page |
| `modal` | **KEEP** | 82 | 236 | 0 | the one overlay shape kept; dialog and side-panel defer to it |
| `list-box` | **KEEP** | 81 | 241 | 6 | forced by dropdown |
| `overflow-menu` | **KEEP** | 78 | 203 | 2 | row actions in the table page |
| `tabs` | **KEEP** | 76 | 186 | 0 | detail page |
| `button` | **KEEP** | 69 | 164 | 35 | every interactive shape needs it; 35 components depend on it |
| `data-table` | **KEEP** | 59 | 210 | 0 | the table page shape · **four modules, all four admitted 2026-08-28** |
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
| `multiselect` | **KEEP** | 97 | 291 | 1 | **ADMITTED 2026-09-01, §4.9 batch 1.** The deferral read "add with combo-box or not at all — measured +0.6 KB gzipped"; §2.1 now asks only whether a capture exists, and it does |
| `file-uploader` | **KEEP** | 91 | 258 | 0 | **ADMITTED 2026-09-01, §4.9 batch 1.** The deferral read "add when a form template needs uploads — measured +1.1 KB gzipped"; §2.1 now asks only whether a capture exists, and it does |
| `combo-box` | **KEEP** | 83 | 249 | 0 | **ADMITTED 2026-09-01, §4.9 batch 1.** The deferral read "filterable dropdown; add if a template needs type-ahead — measured +0.2 KB gzipped"; §2.1 now asks only whether a capture exists, and it does |
| `progress-indicator` | **KEEP** | 76 | 196 | 0 | **ADMITTED 2026-08-29, reversing its own DEFER.** The deferral read "multi-step wizard; no target shape has one"; §4.6's seventh exit attempt built that shape, so the stated condition was met. **Measured +0.9 KB gzipped** (58.0 → 58.9), against the 1.1 KB the deferral estimated. All five status icons were already in the sprite and three capture stories carry the markup, so the rest of the price was paid. IBM's guidance is explicit that the hand-composed substitute was the wrong component — `composing-pages.md` §3.10 and §3.11 are both consequences of it |
| `toggletip` | **KEEP** | 71 | 173 | 2 | **ADMITTED 2026-08-31, with the picker work.** +0.2 KB gzipped and 3 classes measured against the shipped set: a toggletip is a `popover-container` plus `toggletip`, `toggletip-button` and `toggletip-content`. **No behaviour to write** — `js/popover.js` already claims `.rux--popover-container` on click and keeps `aria-expanded` in step, which is what a toggletip is. 46 stories reference it. Admitted WITH the pickers rather than on its own cheapness, which §2.1 is explicit has never decided anything here |
| `time-picker` | **KEEP** | 47 | 167 | 0 | **ADMITTED 2026-08-31. It does NOT pair with date-picker, and this row said it did.** Measured separately: +0.4 KB gzipped and 9 classes, against date-picker's +3.4 KB and 41. Its whole markup is `time-picker__input-field` over `text-input` plus two NATIVE `<select>`s, both already compiled, so there is **no calendar, no popover, no keyboard model and no module to write**. Bundling the two hid that for three revisions |
| `slider` | **KEEP** | 45 | 176 | 0 | **ADMITTED 2026-09-01, §4.9 batch 1.** The deferral read "no target shape needs it yet — measured +1.4 KB gzipped"; §2.1 now asks only whether a capture exists, and it does |
| `date-picker` | **KEEP** | 43 | 120 | 1 | **ADMITTED 2026-08-31, under rule 1** — `templates/schedule-page.html` is the named page shape, and it shipped with a plain text input standing in for this. **Measured +3.4 KB gzipped and 41 classes.** **THE ADMISSION TURNED ON WHICH OF CARBON'S TWO DATE PICKERS THIS IS.** The CLASSIC one (`components-datepicker--*`) renders its calendar through FLATPICKR: measured 2026-08-31, the open calendar matches 4 rules via `flatpickr-*` selectors and ZERO via `cds--`, so `cds--date-picker__calendar` is a marker that styles nothing and rebuilding it would mean shipping flatpickr, which §1 declines. The **`--next`** variant (`preview-preview-datepicker--*`) renders ZERO flatpickr elements, days as real `<button type=button>`, calendar as `role=grid`, and all 64 calendar rules key on Carbon's own classes. That is what ships. **The committed capture could not have told you this** — `react-dom.js` filters classes to the `cds--` prefix, so the classic capture records clean Carbon markup with its dependency invisible. Two recipes were added and the `--next` stories captured with the calendar OPEN (`preview-preview-datepicker--*-with-calendar@open`), which also fixed two real `check-tags` faults waiting to happen: `__day` was attested only on `span` and `__weekday` only on `span`, where `--next` renders `button` and `div`. `js/date-picker.js` is the 13th module; `sink/date-picker.html` demos simple, single and range at 47%. **The day STATE classes are unprefixed** — `selected`, `today`, `inRange`, `prevMonthDay`, `nextMonthDay`, `disabled`, `focused` — so no capture records them and no gate can check them; they were read off `css/rux.css` and confirmed live |
| `treeview` | **KEEP** | 20 | 86 | 0 | **ADMITTED 2026-09-01, §4.9 batch 1.** The deferral read "no target shape needs it yet — measured +0.7 KB gzipped"; §2.1 now asks only whether a capture exists, and it does |
| `progress-bar` | **KEEP** | 8 | 21 | 0 | **ADMITTED 2026-09-01, §4.9 batch 1.** The deferral read "8 KB; cheap to add back when something reports progress — measured +0.6 KB gzipped"; §2.1 now asks only whether a capture exists, and it does |
| `icon-indicator` | **KEEP** | 3 | 18 | 1 | **ADMITTED 2026-09-01, §4.9 batch 4.** Was: "status vocabulary; tag covers most of it — measured +0.4 KB gzipped"; §4.9 now asks whether a capture exists, and two do |
| `action-set` | **KEEP** | 2 | 19 | 0 | **ADMITTED 2026-09-01, §4.9 batch 5.** The 2026-09-01 sort said no story renders it; every one of the ten side-panel captures does, as its actions container — the search had read story names, not their DOM. Was: "2 KB; modal footers may want it in Phase 6 — measured +0.3 KB gzipped" |
| `shape-indicator` | **KEEP** | 2 | 17 | 0 | **ADMITTED 2026-09-01, §4.9 batch 4.** Was: "status vocabulary; tag covers most of it — measured +0.3 KB gzipped"; §4.9 now asks whether a capture exists, and two do |
| `aspect-ratio` | **KEEP** | 1 | 12 | 0 | **ADMITTED 2026-09-01, §4.9 batch 1.** The deferral read "1 KB layout primitive; Phase 6 may want it — measured +0.1 KB gzipped"; §2.1 now asks only whether a capture exists, and it does |
| `stack` | **KEEP** | 1 | 15 | 1 | restored 2026-08-28 — two templates had no vertical rhythm without it. Item 4 |
| `badge-indicator` | **KEEP** | 1 | 2 | 0 | restored 2026-08-29 — the shell ships a Notifications button and the system could not express an unread count at all. **Measured +0.1 KB gzipped / 2 classes**, both exercised. Carbon renders it only as the last child of an icon-only button, which supplies its containing block |
| `fluid-multiselect` | **KEEP** | 124 | 362 | 0 | **ADMITTED 2026-09-01, §4.9 batch 2**, once batch 1 admitted its base. Was: "HELD BY ITS BASE, not by cost, 2026-08-31. The other nine fluid partials were admitted; this one needs `multiselect`, which is DEFER. Shipping it would put rule" |
| `fluid-combo-box` | **KEEP** | 107 | 307 | 1 | **ADMITTED 2026-09-01, §4.9 batch 2**, once batch 1 admitted its base. Was: "HELD BY ITS BASE, not by cost, 2026-08-31. The other nine fluid partials were admitted; this one needs `combo-box`, which is DEFER. Shipping it would put rules " |
| `fluid-dropdown` | **KEEP** | 107 | 307 | 0 | **ADMITTED 2026-08-31 with the fluid family.** Fluid is a STYLE, not a component — the label moves inside the field and an `<hr>` divider goes under it; IBM's guidance pairs it with the default style rather than replacing it. One height, 64px, so there are no size variants to demo. Nine of the eleven partials were taken at a **measured +5.04 KB gzipped for the nine**; **compiled and NOT demoed, on purpose**: its fluid form is the whole default markup plus the fluid wrapper, so a specimen would be a second copy of a section this sink already carries. Coverage reads 0%% and the ratchet can only move up |
| `ai-label` | **KEEP** | 99 | 242 | 0 | **ADMITTED 2026-09-01, §4.9 batch 5.** Was: "AI affordance — one decision with slug and chat-button (§4.2)" — §2.1 now asks only whether a capture exists |
| `slug` | **DEFER** | 99 | 242 | 1 | Compiles as `ai-label`'s paired selectors when that component is admitted, but remains undemonstrated: no story renders the `slug` classes themselves. This is a missing-capture state, not a separate rejection |
| `content-switcher` | **KEEP** | 93 | 220 | 0 | **ADMITTED 2026-09-01, §4.9 batch 3.** Was: "overlaps tabs — CONFIRMED BY SUBSTITUTION: the §4.6 exit attempts reached for it twice and contained tabs served both times, correctly. Measured +1.7 " — §2.1 now asks only whether a capture exists |
| `code-snippet` | **KEEP** | 86 | 211 | 0 | **ADMITTED 2026-09-01, §4.9 batch 3.** Was: "documentation component, not an application one" — §2.1 now asks only whether a capture exists |
| `contained-list` | **KEEP** | 86 | 232 | 0 | **ADMITTED 2026-09-01, §4.9 batch 3.** Was: "overlaps list and data-table" — §2.1 now asks only whether a capture exists |
| `dialog` | **KEEP** | 76 | 185 | 0 | **ADMITTED 2026-09-01, §4.9 batch 5.** Was: "overlaps modal; both are the same shape" — §2.1 now asks only whether a capture exists |
| `pagination-nav` | **KEEP** | 74 | 188 | 0 | **ADMITTED 2026-09-01, §4.9 batch 3.** Was: "a second pagination form; one is enough" — §2.1 now asks only whether a capture exists |
| `combo-button` | **KEEP** | 74 | 201 | 0 | **ADMITTED 2026-08-31.** A primary action and a menu trigger in one container. **Measured +0.12 KB gzipped, the cheapest admission this document records** — the menu, the button and the popover chrome it composes are all already compiled, so the partial adds only the container, the seam and the trigger. **No module written**: the menu is PORTALED in Carbon's capture, so trigger and surface are too far apart for the markup to relate them, which is exactly the `data-rux-open` case, and `js/menu.js` already claims any such trigger. Two lines went into `menu.js` so the container gets `--open` and the chevron rotates, the same shape as the `overflow-menu--open` it already sets. **Two attested classes are NOT written**, both §4.1.12: `btn--lg` has no rule at all — Carbon's button sizes stop at `--md` and large comes from `layout--size-lg` — and `combo-button__bottom` appears nowhere in the SCSS. `sink/combo-button.html` at 60%; the four unexercised classes are `__top`, `__top-start`, `__top-end` and the sm/md container sizes' open state |
| `menu-button` | **KEEP** | 73 | 195 | 0 | **ADMITTED 2026-09-01, §4.9 batch 3.** Was: "button + menu composition" — §2.1 now asks only whether a capture exists |
| `copy-button` | **KEEP** | 72 | 177 | 1 | **ADMITTED 2026-08-31.** The old reason — "only exists to serve code-snippet" — reads the v10 component; the current one is a standalone icon button and `code-snippet` stays CUT. **Measured +0.44 KB gzipped**, 14th js module. **THE FEEDBACK IS THE TOOLTIP, NOT `copy-btn__feedback`.** That class has rules in @carbon/styles and appears in **ZERO captures** — it is the v10 bubble left in the stylesheet. Carbon's `@copied` state adds exactly `copy-btn--animating` and `copy-btn--fade-in` to the button and changes nothing else; the word appears because React swaps the TOOLTIP's text. **So this is the one fragment that KEEPS the icon-tooltip chrome the sink declines everywhere else** — the standing call is that a tooltip is the story's hover HINT, and here it is the component's only output. `snippet__icon` is dropped (belongs to the cut `code-snippet`, would report STRIPPED) and `popover--auto-align` with it (js/overlay.js ships no positioning engine). `sink/copy-button.html` at **33%**, and the four unexercised classes are honest: three are the animation states the module sets on INTERACTION, which no load-time gate can see, and the fourth is the unattested `__feedback` |
| `chat-button` | **KEEP** | 70 | 174 | 0 | **ADMITTED 2026-09-01, §4.9 batch 5.** Was: "AI affordance" — §2.1 now asks only whether a capture exists |
| `fluid-time-picker` | **KEEP** | 60 | 182 | 0 | **ADMITTED 2026-08-31 with the fluid family.** Fluid is a STYLE, not a component — the label moves inside the field and an `<hr>` divider goes under it; IBM's guidance pairs it with the default style rather than replacing it. One height, 64px, so there are no size variants to demo. Nine of the eleven partials were taken at a **measured +5.04 KB gzipped for the nine**; **compiled and NOT demoed, on purpose**: its fluid form is the whole default markup plus the fluid wrapper, so a specimen would be a second copy of a section this sink already carries. Coverage reads 0%% and the ratchet can only move up |
| `fluid-date-picker` | **KEEP** | 54 | 139 | 0 | **ADMITTED 2026-08-31 with the fluid family.** Fluid is a STYLE, not a component — the label moves inside the field and an `<hr>` divider goes under it; IBM's guidance pairs it with the default style rather than replacing it. One height, 64px, so there are no size variants to demo. Nine of the eleven partials were taken at a **measured +5.04 KB gzipped for the nine**; **compiled and NOT demoed, on purpose**: its fluid form is the whole default markup plus the fluid wrapper, so a specimen would be a second copy of a section this sink already carries. Coverage reads 0%% and the ratchet can only move up |
| `fluid-search` | **KEEP** | 45 | 163 | 0 | **ADMITTED 2026-08-31 with the fluid family.** Fluid is a STYLE, not a component — the label moves inside the field and an `<hr>` divider goes under it; IBM's guidance pairs it with the default style rather than replacing it. One height, 64px, so there are no size variants to demo. Nine of the eleven partials were taken at a **measured +5.04 KB gzipped for the nine**; demoed in `sink/fluid.html` at 100% |
| `fluid-number-input` | **KEEP** | 43 | 113 | 0 | **ADMITTED 2026-08-31 with the fluid family.** Fluid is a STYLE, not a component — the label moves inside the field and an `<hr>` divider goes under it; IBM's guidance pairs it with the default style rather than replacing it. One height, 64px, so there are no size variants to demo. Nine of the eleven partials were taken at a **measured +5.04 KB gzipped for the nine**; demoed in `sink/fluid.html` at 100% |
| `fluid-text-input` | **KEEP** | 40 | 126 | 1 | **ADMITTED 2026-08-31 with the fluid family.** Fluid is a STYLE, not a component — the label moves inside the field and an `<hr>` divider goes under it; IBM's guidance pairs it with the default style rather than replacing it. One height, 64px, so there are no size variants to demo. Nine of the eleven partials were taken at a **measured +5.04 KB gzipped for the nine**; demoed in `sink/fluid.html` at 100% |
| `fluid-select` | **KEEP** | 29 | 101 | 1 | **ADMITTED 2026-08-31 with the fluid family.** Fluid is a STYLE, not a component — the label moves inside the field and an `<hr>` divider goes under it; IBM's guidance pairs it with the default style rather than replacing it. One height, 64px, so there are no size variants to demo. Nine of the eleven partials were taken at a **measured +5.04 KB gzipped for the nine**; demoed in `sink/fluid.html` at 100% |
| `fluid-text-area` | **KEEP** | 26 | 94 | 0 | **ADMITTED 2026-08-31 with the fluid family.** Fluid is a STYLE, not a component — the label moves inside the field and an `<hr>` divider goes under it; IBM's guidance pairs it with the default style rather than replacing it. One height, 64px, so there are no size variants to demo. Nine of the eleven partials were taken at a **measured +5.04 KB gzipped for the nine**; demoed in `sink/fluid.html` at 100% |
| `side-panel` | **KEEP** | 19 | 86 | 0 | **ADMITTED 2026-09-01, §4.9 batch 5.** Was: "ibm-products; modal covers the overlay need" — §2.1 now asks only whether a capture exists |
| `fluid-list-box` | **KEEP** | 14 | 62 | 3 | **ADMITTED 2026-08-31 with the fluid family.** Fluid is a STYLE, not a component — the label moves inside the field and an `<hr>` divider goes under it; IBM's guidance pairs it with the default style rather than replacing it. One height, 64px, so there are no size variants to demo. Nine of the eleven partials were taken at a **measured +5.04 KB gzipped for the nine**; **compiled and NOT demoed, on purpose**: its fluid form is the whole default markup plus the fluid wrapper, so a specimen would be a second copy of a section this sink already carries. Coverage reads 0%% and the ratchet can only move up |
| `structured-list` | **KEEP** | 11 | 31 | 0 | **ADMITTED 2026-09-01, §4.9 batch 3.** Was: "overlaps data-table — CONFIRMED BY SUBSTITUTION 2026-08-29: the full-width modal wanted the shape Carbon fills with a structured-list, and a `rux--dat" — §2.1 now asks only whether a capture exists |
| `card` | **KEEP** | 9 | 56 | 0 | **ADMITTED 2026-08-31, AGAINST RULE 1 RATHER THAN UNDER IT, and recorded that way on purpose.** No page shape in `templates/` requires a card and `tile` serves the container shape, so both admission tests point the other way; it was taken as the author's call at a **measured +1.2 KB gzipped and 34 classes** (59.7 → 60.9). **The row it replaced said "Carbon has no Card — it is an ibm-products preview (§4.1.14)", and that had become false.** True when §4.1.14 wrote it, when card's markup was to be sourced from `components-tile--*`; since then Carbon promoted the component — `@carbon/styles` 1.114 ships a 474-line `components/card`, `src/app.scss` has carried a commented `@use` for it all along, and `docs/carbon-react-dom.json` renders **17 `preview-preview-card--*` stories emitting `cds--card` 475 times**. Being `preview-*` is not itself disqualifying here: `icon-indicator` and `shape-indicator` are both `preview-*` and both DEFER. Nothing re-reads a CUT row's evidence, which is why a false ground survived. `sink/card.html` is the 38th fragment at 74%; the six unexercised classes are the media family, which needs an `<img>` the sink has never carried, plus the two `--truncate-multi` siblings no story emits and the ai-label pair Phase 3 cut |
| `page-header` | **CUT** | 4 | 32 | 0 | deprecated upstream; an ibm-products component, not @carbon/react — **CONFIRMED BY SUBSTITUTION**: the §4.6 dashboard used the title-stack idiom instead. Measured +0.5 KB gzipped, but deprecation is the reason and price does not move it |
| `resizer` | **CUT** | 1 | 11 | 0 | no reference on either Storybook origin; 1 KB, niche |
| `truncated-text` | **CUT** | 1 | 5 | 0 | no reference, and its expand toggle has an unfixable button-reset gap (§4.1.5) |

**71 KEEP · 1 DEFER · 3 CUT** — 75 rows, every row decided. It read 33/14/28 until
2026-08-31, when `progress-indicator`'s own DEFER reversal was finally tallied and
`toggletip`, `time-picker` and `date-picker` were admitted, and **36/11/28 until
2026-09-05**, when §4.9's admission batches were finally counted here: they moved
thirty-five rows into KEEP and this line was not restamped for any of them.

**"A row changed without the tally under it is how this drifted before; both move
together now" is what this line used to say, and it was wrong.** They did not move
together — the batches landed and the tally sat still for weeks. The sentence is kept
here as the claim the drift disproves, not repeated as a promise. What actually holds
the file honest is narrower and worth saying plainly: `check-inventory` fails on a
component with no row and on a row with no disposition, and **reads no tally at all**.

**That tally covers the original 75 only.** Carbon 1.114 ships 83. The eight new ones
have rows in the section directly below, and all eight are now decided — one DEFER and
seven CUT, 2026-08-31 — so the full count is **77 KEEP · 2 DEFER · 4 CUT**, 83 rows,
every row decided. `npm run verify` holds it there: `check-inventory` fails on a Carbon
component with no row, and on a row that carries no disposition.

## The eight that arrived with Carbon 1.114

The marginal column was sized 2026-08-31 from a regenerated `docs/inventory.json`, each
component compiled on top of the then-shipped set. The dispositions are current; the
paragraphs below keep the first decision and the evidence that later superseded it.

`docs/carbon-react-dom.json` was captured against `@carbon/react` 1.115.0 /
`@carbon/styles` 1.114.0 with no filter and 505 stories, and renders none of the eight.
That originally made every possible fragment invented. A targeted ibm-products capture
then supplied `big-number`, `EditInPlace`, `FullPageError`, `InterstitialScreen` and
`OptionsTile`; a utility capture supplied `scroll-gradient`; the React preview already
supplied both status indicators. Phase 9 admits every one with a usable capture. The
capture requirement did not weaken — the evidence set grew.

`EditInPlace`, `FullPageError`, `InterstitialScreen` and `OptionsTile` are also the **only
PascalCase directories among all 83** — ibm-products' own naming convention, surviving
the move into `@carbon/styles`.

**First decision, 2026-08-31: seven CUT, `big-number` DEFER.** The admission rule settled all
seven without needing a byte of the size column — five fail rule 1 (no named page shape
in `templates/` requires them) and two fail rule 2 (`error-state.html` and `tile`
already serve the shape). Cost decided nothing here, which is the pattern §2.1 recorded
when it removed the KB target: not one of the CUT rows in this document was decided on
bytes, and the whole table was under 1 KB gzipped a component. **Phase 9 superseded the
admission test, not that measurement.** `user-avatar` had already been admitted;
`big-number`, `EditInPlace`, `FullPageError`, `OptionsTile` and `scroll-gradient` are
batch 4. `coachmark` is batch 5. `InterstitialScreen` remains the one separate decision
because its captured carousel styling is absent from @carbon/styles 1.114.

| Component | Disposition | KB | Classes | Marginal | Reason / evidence |
|---|---|---|---|---|---|
| `big-number` | **KEEP** | 4 | 19 | +0.3 KB | **ADMITTED 2026-09-01, §4.9 batch 4.** Was DEFER because tile plus type already served the visual shape and the only capture is an ibm-products `preview-candidate`. §4.9 supersedes that admission test. Its captured `figure`/`figcaption`, second row at `role=math`, and value span now ship as a fragment; uncaptured size, percentage, trend, tooltip and skeleton variants remain unwritten rather than inferred |
| `coachmark` | **DEFER** | 6 | 31 | +0.9 KB | **DEFERRED 2026-09-01, §4.9 batch 5 — a class mismatch, not a decision.** The five captures render `coachmark__next--*`, `coachmark-beacon` and `coachmark-tagline` from ibm-products 2.97, while the partial `@carbon/styles` 1.114 ships styles `coachmark--*` without the `__next` generation; a fragment would either fail check-classes or match no capture. Admit on the Carbon upgrade (§4.4) that aligns the two. Was: "No template shape needs an onboarding beacon. Would need a behaviour module this project h" |
| `EditInPlace` | **KEEP** | 3 | 27 | +0.5 KB | **ADMITTED 2026-09-01, §4.9 batch 4.** Was: "No template shape. Depends on `toggletip-button`"; the targeted ibm-products capture now supplies four stories, and §4.9 supersedes the old admission test |
| `FullPageError` | **KEEP** | 2 | 10 | +0.2 KB | **ADMITTED 2026-09-01, §4.9 batch 4.** Was: "`templates/error-state.html` already builds this shape"; three ibm-products captures now supply its markup, and §4.9 supersedes the old admission test |
| `InterstitialScreen` | **CUT** | 4 | 21 | +0.4 KB | No template shape. **Incomplete on arrival**: it styles `cds--carousel`, and `@carbon/styles` 1.114.0 has no `carousel` component directory at all, so part of it can never resolve. **Rule 1 fails** |
| `OptionsTile` | **KEEP** | 5 | 37 | +0.6 KB | **ADMITTED 2026-09-01, §4.9 batch 4.** Was: "`tile` is compiled and serves the shape"; two ibm-products captures now supply the expandable and static markup, and §4.9 supersedes the old admission test |
| `scroll-gradient` | **KEEP** | 2 | 9 | +0.2 KB | **ADMITTED 2026-09-01, §4.9 batch 4.** Was: "A scroll affordance, not a component a page is composed from"; two ibm-products captures now supply the structure, and §4.9 supersedes the old admission test |
| `user-avatar` | **KEEP** | 5 | 28 | +0.5 KB | **ADMITTED 2026-08-31, and its CUT reason did not survive contact with the component.** That reason was rule 2 — "the shell already answers this", because `app-shell.html` puts the `user--avatar` ICON in a `header__action`. An icon is not this: this is initials or a photo, four sizes, and twelve `--order-N-*` colours meant to be hashed from a name so a person keeps the same colour everywhere. The shell's icon answers "where do I click for my account"; it does not answer "who is this". **Measured +0.68 KB gzipped, 24 classes.** **No module** — an avatar displays and has no state. **THE ONLY FRAGMENT WHOSE REFERENCE IS `c4p--`**: the component was absorbed out of ibm-products into `@carbon/styles` at 1.114, so it compiles under `rux--` here while the only captured stories still render `c4p--`. Checked rather than assumed — 5 of the 6 captured classes resolve after a prefix swap; the sixth, `user-avatar__tooltip`, is ibm-products' own hover chrome and is declined. `sink/user-avatar.html` at 71%: the five unexercised classes are the `__photo` family, which needs an `<img>` this sink has never carried — the same constraint `card` records |

**At the time of the decision above, none had a fragment and none could until its markup
was captured.** The targeted ibm-products capture later supplied five of them; §4.9
batch 4 admits those five alongside the already-captured status indicators. Only
`InterstitialScreen` remains a separate decision because its captured carousel styling
does not exist in @carbon/styles 1.114.

**All eight now carry a commented `@use` line in `src/app.scss`**, added 2026-08-31.
They had none, which meant the build manifest did not list them at all: a component absent
from that file can be neither kept nor cut, because commenting the line is the whole of
cutting one. A commented line emits nothing, so this changed no CSS — it is what makes the
manifest a complete census of the 83 rather than of the 75 it was written against.
`check-inventory` now requires it.

---

## Every row priced, 2026-08-29 — and cost decides nothing

The whole DEFER set and the three contested CUT rows were measured by compiling
each one on top of the shipped keep-set with `tools/measure.mjs`, which is the
only honest way to price a subset. Baseline: **32 components, 520 KB minified,
52.9 KB gzipped, 1,094 classes.**

**Not one candidate costs more than 3.3 KB gzipped.** The dearest is
`date-picker` at +3.3; the cheapest, `aspect-ratio` and `badge-indicator`, are
+0.1. The KB column in the table above is standalone-with-dependencies and
overstates every shared-dependency row by ten to a hundred times —
`content-switcher` reads 93 KB there and costs **+1.7 KB gzipped**; `toggletip`
reads 71 KB and costs **+0.3**.

**So no row is deferred on price any more, and none should be argued on price
again.** Every DEFER row now carries its measured marginal cost, and the reason
each is still out is NEED: no page shape in `templates/` asks for it. That is the
line roadmap §5 draws — a component is admitted to serve a page shape, never a
page shape invented to justify a component.

**The one genuine cost is not in this table.** `date-picker` and `time-picker`
need a calendar reproduced in vanilla JS in Phase 5. +3.3 KB of CSS is not the
price; the behaviour is, and no measurement here speaks to it.

**Do this before Phase 4.** `tools/measure.mjs` compiles against
`node_modules/@carbon`, so it stops working the moment devendor runs. These
figures cannot be taken again afterwards, and neither can any decision that
depends on them.

## What needs your call

These are judgement, not evidence, and I have proposed rather than decided. **They are
also no longer urgent:** Phase 4 moved to the end of the sequence on 2026-08-28, so a
DEFER row that says "decide in Phase 5" or "decide in Phase 6" can now actually be
decided there, with a template in front of you, instead of being frozen by a devendor
that used to run first. Roadmap §4.4.
A fourth — the ≤40 KB target — is **settled**: §2.1 removed the KB target on 2026-08-28
rather than amending it to ≤55 KB as this document originally recommended. The measured
floor for a set that builds all six page shapes is 52.7 KB, and the reason the number
went rather than moved is recorded in §2.1 and above.

1. **`date-picker` / `time-picker` — ANSWERED 2026-08-31: BOTH ADMITTED, and the
   pairing in this entry was wrong.** Measured separately they are not one decision:
   time-picker is +0.4 KB with no module to write, date-picker is +3.4 KB plus the
   calendar. The calendar was bought as a conscious purchase, which is what this entry
   asked for. See both rows above.
2. **`combo-box` / `multiselect` — RE-AFFIRMED DEFER, 2026-08-31.** Put to the author
   with the measured cost and the capture count; deferred again because no page shape
   needs them, which is the only ground that would admit them. Type-ahead and
   multi-select are common in
   real forms. They are out because no target shape names them, not because they are bad
   — and the KB column overstates them the same way: **together they add 7 KB minified /
   0.8 KB gzipped**, since both are built from `list-box`, `text-input`, `checkbox` and
   `tag`, all of which already ship. For scale, the seven sub-8 KB DEFER rows together
   add 14 KB minified / 1.9 KB gzipped.
3. **`toggletip` — ANSWERED 2026-08-31: ADMITTED with the picker work**, not on its own
   cheapness. The entry below already had the cost right; what it lacked was a reason to
   buy, and the pickers supply one. Original entry follows.

   **`toggletip` — DEFER, but NOT on cost.** This entry read "out on cost at 71 KB",
   which is this document's own warning ignored two sections above where it is written:
   71 KB is the standalone-with-dependencies figure, and toggletip shares popover,
   button and tooltip with the keep-set. **Measured marginal cost is 3 KB minified /
   0.3 KB gzipped.** Defer it because nothing needs it yet — the price is not the
   reason. Corrected 2026-08-28, re-measured against the shipped themes.

4. **`stack` — RESTORED 2026-08-28, on the terms this row was written with.** It is
   now KEEP in the table above. What follows is the case as it stood, kept because the
   decision reads better with the evidence that produced it than without.

   **`stack` — DEFER, and its condition has been met.** This row said "Phase 6 may
   want it". Phase 6 wants it. `templates/form-page.html` is the first page in the
   repository with a form on it, and a form built from the compiled set has **no
   vertical rhythm at all**: Carbon spaces one with `stack-vertical stack-scale-7`,
   and `.rux--form-item` carries no vertical margin of its own.

   **This is evidence, not judgement, which is why it is here rather than above.**
   Read off a running `components-form--default` on 2026-08-28: the stack computes to
   `display: grid` with `row-gap: 32px`, and every child reports
   `margin-block-start: 0`. Carbon zeroes its controls' margins deliberately and
   spaces from the container. A margin-based stand-in therefore cannot work — the
   first attempt lost to `.rux--checkbox-group`'s own `margin: 0`, specificity (0,1,0)
   against (0,0,2), and the gap measured zero.

   **The template carries a `<style>` block standing in for it today**, using the same
   grid mechanism. That is the wrong home for it: it must be repeated in every
   template that holds a form, and a design system whose spacing lives in its
   templates is not the source of its own spacing. Roadmap §4.4 carries the plan.

   **Price: 1 KB, 15 classes, 0 tokens** — the cheapest row in this table, and the
   §2.1 KB target that would have argued against it no longer exists.

Rows marked CUT with an evidence reason — `slug`, `resizer`, `truncated-text`,
`page-header`, `side-panel` — came out of the Phase 1 markup sweep and are not judgement
calls: nothing in the 667 captured stories emits them, or they belong to
`@carbon/ibm-products` rather than Carbon proper.

**`card` was in that list until 2026-08-31 and was the one entry it got wrong.** The
sweep's reading was right when taken; Carbon has since promoted Card out of
`ibm-products`, and 17 react stories emit `cds--card` 475 times. **An evidence reason
ages like any other figure, and nothing in this repository re-reads one** — a disposition
whose ground has expired looks identical to one whose ground still holds. That is the
general finding; the row is only where it surfaced.

---

## Reproducing the numbers

```bash
npm run inventory                 # per-component size, classes, @use graph, tokens
node tools/measure.mjs            # full vs proposed set, gzipped
node tools/measure.mjs --themes 1 button form popover tooltip   # any ad-hoc set
```
