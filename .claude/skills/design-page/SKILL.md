---
name: design-page
description: Build a page out of Design — a new template, a consumer page, or a page shape none of the templates covers. Use when asked to create, compose or lay out a page with these components, or when a page built from them looks wrong. Encodes which template to copy, the four failures that produce a finished-looking wrong page, and where IBM's own pattern guidance applies. Knowing the components is not knowing how to assemble them.
---

# Building a page

`design/sink/*.html` says what a component **is**. This is how to put them together.

**`design/docs/composing-pages.md` is the full procedure**, with the reason for every
trap. This skill is the ordered version for doing the work; go to the document
for why any line here is true.

## 1. Copy a template — never start from scratch

Twelve exist, each a **complete page**, shell included.

| page | start from |
| :--- | :--- |
| nav and header, nothing else | `design/templates/app-shell.html` |
| list of records, sortable, selectable | `design/templates/table-page.html` |
| create or edit one record | `design/templates/form-page.html` |
| view one record | `design/templates/detail-page.html` |
| read one record top to bottom | `design/templates/document-page.html` |
| a query, facets, and the results | `design/templates/search-results-page.html` |
| nothing to show yet | `design/templates/empty-state.html` |
| one step of a multi-step flow | `design/templates/wizard-page.html` |
| an overview of many things | `design/templates/dashboard-page.html` |
| grouped preferences | `design/templates/settings-page.html` |
| dates and times | `design/templates/schedule-page.html` |
| something went wrong | `design/templates/error-state.html` |

**Not `design/sink/ui-shell.html`**: same shell in a 22rem sandbox, positioned for a
specimen.

**Read the source comments in what you copied.** Most record an approach that
failed. The comment above the thing you are about to change is usually the
answer to your question.

## 2. Compose it — the decision table

**`design/docs/choices.md` is the catalogue and the only source of options.** Every
entry there is attested: a template or a sink fragment renders it, diffed
against a Carbon capture. So an answer that is not in the table below is not a
harder version of this job; it is a request to `design/docs/choices.md` first.

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
| 7 | Button size | `xs` `sm` `md` `lg` `xl` | the size class | `lg`, which carries no class; every template button is `lg` |
| 8 | Body blocks | any name in `design/sink/ORDER` | what goes inside `.rux--content` | the template's own |

**Five things are not choices**, and offering them is itself the error:

- **The side nav.** Only the expanded, fixed variant is captured. No rail, no
  collapsed-by-default; ask before offering one.
- **The header's theme.** `g100` by Carbon's own guidance, whatever the page is.
- **The mark.** It is the brand.
- **Button states**: disabled, loading, selected. The page sets them; they are
  not decided at creation.
- **Fluid for checkbox, radio, toggle and the list-box family.** No fluid form
  exists for them, so row 5 cannot reach them.

**Row 5 is one decision for the whole form, not one per field.** Carbon does not
mix regular and fluid in a group.

Everything the table offers is already compiled. §3 is for anything you reach
for beyond it.

### Where the template stops and you start

A template, or `builder.html`'s download of one with its answers filled in,
settles rows 1 and 2 plus name, title and file. Rows 3 to 8 are composition,
which is this skill. Start from the copy, then compose into it. A new app's
steps are in the repository's `AGENTS.md`, the "a new app" row.

### Gate the result

**The gates live in Design.** Compose the page in this checkout and run
`npm run verify` in `design/` before it leaves; that catches the invented class
and the uncompiled component while it is still cheap. For an app's pages, the
repository's `npm run check` runs Design's shared check.

**Check the exit code; do not grep the output.** Then §7: open the page,
because a passing check is not the page being right.

## 3. Confirm the component is compiled

`design/docs/inventory.md` decides every component and gives the reason for each cut.
Keep counts out of this file; they go stale. `page-header` is cut, and
`design/src/app.scss` carries it commented out.

A class for an uncompiled component resolves to nothing and **fails silently**:
correct-looking markup, no styling. `npm run verify` catches it, so the loop is
short, but checking first saves designing around something absent.

## 4. Four failures that produce a finished-looking wrong page

Check these *while writing*, because none of them looks broken.

1. **A tile inside `layer-two` is invisible on a plain page.** `layer-two`
   resolves to the page's own white. Correct only inside something already
   painting `layer`, like a tab panel. Bare `rux--tile` gives
   `rgb(244,244,244)` and is visible.
2. **Nothing offsets `.rux--content` for a nav inside the header.** Only a
   *sibling* nav indents it. Keep the template's breakpoint-scoped
   `padding-inline-start: 18rem`. A grid offset (`lg:col-start-4`) is wrong,
   proportional against a fixed 16rem nav. So is a margin.
3. **The sprite must be inlined.** `<use>` against an external file is blank in
   Safari (no cross-document `<use>`) and blocked over `file://`. Fails
   **silently**: a fully styled page with no icons. Keep the `SPRITE:BEGIN` and
   `SPRITE:END` markers from the template; `npm run icons` refreshes templates
   and marked Design root pages, and the repository's `npm run build` refreshes
   app pages.
4. **Without `rux--stack-vertical` everything is flush.** No automatic vertical
   rhythm exists. Pair it with a scale; the templates use `stack-scale-3`
   through `-7`, usually `-6`. **No gate catches this.**

The rest are in `design/docs/composing-pages.md` §3, several of them invisible to every
gate:

- **An unattested composition inherits no spacing** (§3.10). A tag inline after
  list text gets only a 4px word space, and `stack-horizontal` is NOT the fix:
  it cannot wrap and truncates the tag in a narrow column.
- **An ordered list's numbers render 24px outside its own box** (§3.11), so they
  escape into the gutter unless the container is padded.
- **Type utility classes** (§3.9): `rux--type-*` is how a `<legend>` group name
  is lifted above the field label beside it. Keep the `<legend>`; an `<h2>` loses
  the fieldset's accessible grouping.
- **Pagination drops its selects and labels under 672px** (§3.13).
- **A toast region is the app's own** (§3.14).
- Also: the two shells (§3.3a), specimens that are not operable, `aria-hidden`
  over focusable children, an overflow menu covering its trigger, and no
  responsive metric-row idiom.

## 5. What must not be invented

- **Classes.** Every `rux--*` comes from Carbon. `npm run verify` fails on one
  that does not resolve or whose component is not compiled.
- **Markup structure.** Diff against `design/data/carbon-*.json`, not against a guess
  and not against the live Storybook; the captures match the compiled version
  and need no network. `node tools/diff-fragment.mjs <name>`.
- **Behaviour Carbon does not have.** Modules make Carbon's components work;
  they do not add interactions Carbon declines.
- **Decisions.** `AGENTS.md` and the design system README carry choices
  already made. Ask before reopening one.

## 6. IBM's own pattern guidance

`design/carbon-website/` is on disk, gitignored: *read from, never shipped*. Its
pattern pages under `design/carbon-website/src/pages/patterns/` cover empty states, forms, dialogs,
notifications, filtering, global header, login, loading, search, and disabled
and read-only states. Good on anatomy and when-to-use, which the component
reference cannot answer.

**Two limits.** The patterns assume all of Carbon, so read each against
`design/docs/inventory.md` first. And this repository is **public**: record facts and
decisions with citations, never paste prose. `NOTICE` covers Carbon's
Apache-2.0 *code*, not website guidance content.

For markup the captures remain authoritative. The website says what a pattern
should do; `design/data/carbon-*.json` says what the markup is.

## 7. Open the page

**The gates cannot see everything, so looking is not optional.** Defects that
passed every gate include chevrons rotated from the wrong base glyph, missing
wrappers, and menu specimens that were `visibility: hidden`.

Run the browser gates on **your** page. `check-a11y`, `check-runtime-classes`
and `check-spacing` take **no page argument**: they read whatever document they
are evaluated in, so load your page and run the tool there, fetched from the
server rather than pasted.

`check-rendered` cannot be pointed at an arbitrary page: its unit is the
`.ks-sec` section no template has. `check-behaviour` can; it skips what the
page does not carry instead of failing it. Read it as a diagnostic; the required
coverage is still the sink's.

## 8. If the page is a template

`design/docs/verifying-templates.md` is the procedure, and it has one hard rule: a
template's behaviour is **verified against a running Carbon page**, never
derived from `design/css/rux.css`. The stylesheet gives the mechanism and says nothing
about intent. `check-provenance` requires a `BEHAVIOUR:` comment naming the
reference page, the date, and what was NOT covered.

## Using this outside Design

An app is a folder beside `design/` in the same repository, and its pages link
`design/css/`, `design/assets/` and `design/js/` live from `/design/`, **not this skill, not
`design/sink/`, not the captures, and not the gates**. Everything in §5 is unenforced
there unless the app adopts it deliberately. The root `npm run check` runs
Design's shared check over every app `switcher.json` lists, against the
Design in the same tree, so a page and the stylesheet it is checked against
are always the same revision.
