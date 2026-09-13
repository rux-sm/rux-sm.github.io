---
name: rux-ds-page
description: Build a page out of rux-ds — a new template, a consumer page, or a page shape none of the ten templates covers. Use when asked to create, compose or lay out a page with these components, or when a page built from them looks wrong. Encodes which template to copy, the four failures that produce a finished-looking wrong page, and where IBM's own pattern guidance applies. Knowing the components is not knowing how to assemble them.
---

# Building a page

`sink/*.html` says what a component **is**. This is how to put them together.

**`docs/composing-pages.md` is the full procedure** — twelve traps, each citing
where the failure is recorded. This skill is the ordered version for doing the
work; go to the document for why any line here is true.

## 1. Copy a template — never start from scratch

Twelve exist, each a **complete page**, shell included.

| page | start from |
| :--- | :--- |
| nav and header, nothing else | `templates/app-shell.html` |
| list of records, sortable, selectable | `templates/table-page.html` |
| create or edit one record | `templates/form-page.html` |
| view one record | `templates/detail-page.html` |
| read one record top to bottom | `templates/document-page.html` |
| a query, facets, and the results | `templates/search-results-page.html` |
| nothing to show yet | `templates/empty-state.html` |
| one step of a multi-step flow | `templates/wizard-page.html` |
| an overview of many things | `templates/dashboard-page.html` |
| grouped preferences | `templates/settings-page.html` |
| dates and times | `templates/schedule-page.html` |
| something went wrong | `templates/error-state.html` |

**Not `sink/ui-shell.html`** — same shell in a 22rem sandbox, positioned for a
specimen.

**Read the source comments in what you copied.** Thousands of lines across the
ten, most of it recording an approach that was tried and failed. The comment
above the thing you are about to change is usually the answer to your question.

## 2. Compose it — the decision table

**`docs/choices.md` is the catalogue and the only source of options.** Every
entry there is attested: a template or a sink fragment renders it, diffed
against a Carbon capture. So an answer that is not in the table below is not a
harder version of this job — it is a request to `docs/choices.md` first, and
then to whichever layer owns it.

Ask only what is still undecided. A brief that already names the shape and the
theme has answered rows 1 and 2; do not re-ask them. When the answer is "your
call", take the default and say which one you took.

| # | Question | The only answers | What it changes | Default |
| :-- | :--- | :--- | :--- | :--- |
| 1 | Page shape | the twelve in §1 | which template you copy | the nearest row in §1 |
| 2 | Theme | `white` `g10` `g90` `g100` `rux` | `data-theme` on `<html>` | `white`; `g10` when cards should stand off the page; `g90`/`g100` for a dark tool |
| 3 | Header nav links | present, absent | the `<nav class="rux--header__nav">` block | present |
| 4 | Global actions and the switcher panel | present, absent | `rux--header__global` and its sibling panel | present |
| 5 | Field style | regular, fluid | the six controls that have both: text input, text area, select, number input, search, date picker | regular |
| 6 | Button kinds | primary, secondary, tertiary, ghost, danger, danger tertiary, danger ghost | the modifier on each `rux--btn` | one primary per view, secondary beside it, ghost for the quiet action |
| 7 | Button size | `xs` `sm` `md` `lg` `xl` | the size class | `lg`, which is the default and carries no class; `sm` inside tables and toolbars |
| 8 | Body blocks | any name in `sink/ORDER` | what goes inside `.rux--content` | the template's own |

**Five things are not choices**, and offering them is itself the error:

- **The side nav.** Only the expanded, fixed variant is captured. No rail, no
  collapsed-by-default — ask before offering one.
- **The header's theme.** `g100` by Carbon's own guidance, whatever the page is.
- **The mark.** It is the brand.
- **Button states** — disabled, loading, selected. The page sets them; they are
  not decided at creation.
- **Fluid for checkbox, radio, toggle and the list-box family.** No fluid form
  exists for them, so row 5 cannot reach them.

**Row 5 is one decision for the whole form, not one per field.** Carbon does not
mix regular and fluid in a group, so mixing them is a composition the captures
do not attest.

Everything the table offers is already compiled — that is what "attested" buys.
§3 is for anything you reach for beyond it.

### Where the template stops and you start

A template, or `builder.html`'s download of one with its answers filled in,
settles rows 1 and 2 plus name, title and file: what a text substitution on a
template can honestly change. Rows 3 to 8 are composition, and composition is
this skill. Start from the copy, then compose into it. A new app is that page
saved as `index.html` in a folder named for its URL beside `rux-ds/`, plus one
entry in the repository's `switcher.json`; the scaffold script that used to
write it left on 2026-09-12.

### Gate the result through this root

**The gates live here and nowhere else** — a consumer vendors `css/`, `assets/`
and `js/`, not them. So whatever the page is ultimately for, compose it inside
this checkout and run `npm run verify` before it leaves. That is what catches
the invented class and the uncompiled component while it is still cheap.

**Check its exit code; do not grep its output.** Then §7 — open the page,
because verify passing is not the page being right.

## 3. Confirm the component is compiled

`docs/inventory.md` decides every component and gives the reason for each cut.
**The figure belongs in `portal.html` and `npm run verify`, never in this file**:
this section read "34 of 75" until 2026-09-02, by which time it was wrong in both
numbers and named `date-picker`, `combo-box` and `toggletip` as deferred when all
three had been admitted. `page-header` is cut, and `src/app.scss` carries it
commented out.

A class for an uncompiled component resolves to nothing and **fails silently** —
correct-looking markup, no styling.

`npm run verify` catches it, so the loop is short. Knowing first saves designing
around something absent — or, as that stale paragraph did, around something that
has been there for days.

## 4. Four failures that produce a finished-looking wrong page

These are the ones to check *while writing*, because none of them looks broken.

1. **A tile inside `layer-two` is invisible on a plain page.** `layer-two`
   resolves to the page's own white. Correct only inside something already
   painting `layer`, like a tab panel. Bare `rux--tile` gives
   `rgb(244,244,244)` and is visible. Copying the idiom out of
   `detail-page.html` faithfully is what shipped this.
2. **Nothing offsets `.rux--content` for a nav inside the header.** Only a
   *sibling* nav indents it. Keep the template's breakpoint-scoped
   `padding-inline-start: 18rem`. A grid offset (`lg:col-start-4`) was tried and
   is wrong — proportional against a fixed 16rem nav. So is a margin.
3. **The sprite must be inlined.** `<use href="#i-name">` against an external
   file is blank in Safari (no cross-document `<use>`, ever) and blocked over
   `file://`. Fails **silently** — a fully styled page with no icons.
   `npm run icons` covers `templates/` only; anything else splices by hand and
   drifts.
4. **Without `rux--stack-vertical` everything is flush.** No automatic vertical
   rhythm exists. Pair it with a scale — the templates use `stack-scale-3`
   through `-7`, usually `-6`. **No gate catches this**; `portal.html` shipped
   with none and passed all seventeen.

Eight more are in `docs/composing-pages.md` §3, including two found by LOOKING
with every gate green: **an unattested composition inherits no spacing** — a tag
inline after list text gets only a 4px word space, and `stack-horizontal` is NOT
the fix, it cannot wrap and truncates the badge in a narrow column — and **an
ordered list's numbers render 24px outside its own box**, so they escape into
the gutter unless the container is padded. Also: specimens that are not operable,
`aria-hidden` over focusable children, an overflow menu covering its trigger,
the missing responsive metric-row idiom, and **the type utility classes** —
`rux--type-*`, 73 of them, which is how a `<legend>` group name is lifted above
the field label beside it. Keep the `<legend>`; an `<h2>` loses the fieldset's
accessible grouping.

## 5. What must not be invented

- **Classes.** Every `rux--*` comes from Carbon. `npm run verify` fails on one
  that does not resolve or whose component is not compiled.
- **Markup structure.** Diff against `docs/carbon-*.json`, not against a guess
  and not against the live Storybook — the captures match the compiled version
  and need no network. `node tools/diff-fragment.mjs <name>`.
- **Behaviour Carbon does not have.** Modules make Carbon's components work;
  they do not add interactions Carbon declines.
- **Decisions.** Roadmap §1.1, §2.1, §4.4, §4.6 record choices *with their
  rejected alternatives*. Ask before reopening one.

## 6. IBM's own pattern guidance

`carbon-website/` is on disk, gitignored — *read from, never shipped*.
Seventeen pattern pages under `src/pages/patterns/`: empty states, forms,
dialogs, notifications, filtering, global header, login, loading, search,
disabled and read-only states. Good on anatomy and when-to-use, which the
component reference cannot answer.

**Two limits.** The patterns assume all of Carbon — read each against
`docs/inventory.md` first. And this repository is **public**: record facts and
decisions with citations, never paste prose. `NOTICE` covers Carbon's
Apache-2.0 *code*, not website guidance content.

For markup the captures remain authoritative. The website says what a pattern
should do; `docs/carbon-*.json` says what the markup is.

## 7. Open the page

**The gates cannot see everything and looking is not optional.** Five shipped
defects passed every gate: two chevrons rotated from the wrong base glyph, a
missing positioning wrapper, a missing styled wrapper, four menu specimens that
were `visibility: hidden`.

Run the browser gates on **your** page. `check-a11y`, `check-runtime-classes`
and `check-spacing` work on a template as well as the sink — **there is no page
argument**, they read whatever document they are evaluated in, so load your page
and run the tool there, fetched from the server rather than pasted. A bug
shipped nine times in `table-page.html` because nobody did this.

One cannot be pointed at an arbitrary page: `check-rendered`, whose unit is the
`.ks-sec` section no template has. `check-behaviour` can be, since 2026-09-08 —
it skips what the page does not carry instead of failing it — but read it as a
diagnostic; the required cell is still the sink's.

**Use the `sink-check` skill for the procedure** — its eight conditions each exist
because getting one wrong produced a confident wrong number. `npm run gates`
says which gate has been run against which page.

## 8. If the page is a template

`docs/verifying-templates.md` is the procedure, and it has one hard rule: a
template's behaviour is **verified against a running Carbon page**, never
derived from `css/rux.css`. The stylesheet gives the mechanism and says nothing
about intent — four wrong shell answers in one sitting came from reading it and
guessing. `check-provenance` requires a `BEHAVIOUR:` comment naming the page as
a URL, the date, and what was NOT covered.

## Using this outside rux-ds

An app is a folder beside `rux-ds/` in the same repository, and its pages link
`css/`, `assets/` and `js/` live from `/rux-ds/` — **not this skill, not
`sink/`, not the captures, and not the gates**. Everything in §5 is unenforced
there unless the app adopts it deliberately. The root `npm run check` runs
rux-ds's shared check over every app `switcher.json` lists, against the
rux-ds in the same tree, so a page and the stylesheet it is checked against
are always the same revision.
