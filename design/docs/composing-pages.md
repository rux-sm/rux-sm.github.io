---
type: how-to
---

# Composing pages

`sink/*.html` says what each component is. This says how to put them together
and what goes wrong on the way. `.claude/skills/design-page/` is the ordered
version for doing the work; the reasons live here, so a rule is written once.

---

## 1. Start from a template, never from scratch

Each is a **complete page**, shell included. Copy the nearest shape and delete
what you do not need.

| your page | start from |
| :--- | :--- |
| anything with a nav and a header | `templates/app-shell.html` |
| an overview of many things | `templates/dashboard-page.html` |
| a list of records, sortable, selectable | `templates/table-page.html` |
| creating or editing one record | `templates/form-page.html` |
| viewing one record | `templates/detail-page.html` |
| reading one record top to bottom, in order | `templates/document-page.html` |
| a query, facets that narrow it, and the results | `templates/search-results-page.html` |
| grouped preferences that save | `templates/settings-page.html` |
| one step of a multi-step flow | `templates/wizard-page.html` |
| dates and times | `templates/schedule-page.html` |
| nothing to show yet | `templates/empty-state.html` |
| something went wrong | `templates/error-state.html` |

**Do not start from `sink/ui-shell.html`.** It is the same shell in a 22rem
sandbox, so its header and nav are positioned for a specimen rather than a page.

**Read the source comments in the template you copied.** Most record an approach
that failed. The comment above the thing you are about to change is usually the
answer to the question you are about to ask.

---

## 2. Check the component is actually compiled

`docs/inventory.md` lists which Carbon components are in `css/rux.css`, with the
reason for each cut. A class for a component that is not compiled resolves to
nothing and fails silently: the markup looks right and the page has no styling.

`npm run verify` catches this (`check-classes` fails on a class that does not
resolve, or whose component is not compiled). Checking first saves designing
around something that is not there. `page-header` is cut.

---

## 3. The traps

Several of these pass every gate. The ones that make a page look *finished and
wrong* are worse than broken, so check them by looking.

### 3.1 A tile inside `layer-two` is invisible on a plain page

`rux--layer-two > rux--tile` is correct **only** inside something already
painting `layer`, such as a tab panel. On a plain page `layer-two` resolves to
the page's own white and the tile disappears: white on white, no border.

**Bare `rux--tile` on a white page gives `rgb(244,244,244)` and is visible.**
`detail-page.html` states the condition in its own source.

### 3.2 Nothing offsets the content for a nav inside the header

`.rux--content` is indented only by a **sibling** side nav. The nav in this
shell lives inside the header, so none of Carbon's rules match and the content
starts underneath the nav.

The templates fix it with breakpoint-scoped fixed padding in their `<head>`:
`@media (min-width: 66rem) { .rux--content { padding-inline-start: 18rem; } }`.
16rem clears the nav; the remaining 2rem is `.rux--content`'s own padding.

**A grid offset is wrong**: `lg:col-start-4` is proportional while the nav is a
fixed 16rem. A margin is wrong too. `templates/app-shell.html` records why.

### 3.3 `--side-nav--ux` is 16rem, and is not the rail

Three widths, easily confused: bare `.rux--side-nav` is 3rem,
`--side-nav--rail` is the rail, `--side-nav--ux` is the 16rem nav the templates
use. Picking the wrong one silently breaks 3.2's padding, which assumes 16rem.

### 3.3a Two shells, and one class picks which one you have

`__menu-toggle__hidden` is written by **your markup**. `rux.css` never adds it;
it only acts on it above 66rem. So the class is how a page declares its shell,
and no gate tells the two apart.

| | toggle | nav | at desktop |
| :--- | :--- | :--- | :--- |
| **persistent** | carries `__hidden` | `--side-nav--ux` | nav always open, button hidden |
| **collapsible** | no `__hidden` | `--side-nav--ux --side-nav--hidden` | button present, nav opens over the page |

**Every template ships the persistent shell.** Take it unless the page cannot
afford a permanent 16rem column; a wide board or table is the case that cannot.

**If you take the collapsible shell, two things follow.**

**Drop §3.2's `padding-inline-start: 18rem`.** Otherwise the content is indented
past a nav that is closed.

**Your app name moves to 8px and `check-spacing` reports it.** Carbon's
`.rux--header__menu-toggle:not(.__hidden) ~ .rux--header__name` sets
`padding-inline-start: 0.5rem` at every width in this shell. Every capture is of
the persistent shell, so the gate reports 8px against 16. That is the rule
working, not a defect.

### 3.4 The sprite must be inlined into every page

Referencing `../assets/icons.svg#i-name` from a `<use>` **fails silently**:
WebKit does not support a cross-document `<use>`, so every icon is blank in
Safari, and `file://` blocks the fetch in every engine.

Copy the block between `SPRITE:BEGIN` and `SPRITE:END` with the rest of the
template. `npm run icons` rewrites that block in every template and in any page
at the Design root that carries the markers (`tools/lib/sources.mjs`
`spritePages()`), and `check-icons` fails if one drifts. For an app's pages, the
repository's `npm run build` re-inlines it and `npm run check` fails a stale copy.

### 3.5 Without `stack-vertical`, everything is flush

There is no automatic vertical rhythm. Without `rux--stack-vertical` every child
has margin 0: headings flush against the section above, tiles merged into slabs.

Use `rux--stack-vertical` with a scale. The templates use `rux--stack-scale-3`
through `-7`, most often `-6`.

**No gate catches this.** `check-spacing` compares *classed* elements against
Carbon's computed signatures, and the gap between an `h2` and the section under
it belongs to neither element.

**Between grid ROWS it is a different class.** `.rux--css-grid` sets no
`row-gap`, so columns that stack below `lg` are flush, and a stack *inside* a
column cannot reach the gap *between* rows.

```html
<div class="rux--css-grid rux--css-grid--with-row-gap">
```

That gives `row-gap: var(--rux-grid-gutter)`, attested in Carbon's
`elements-grid--with-row-gap` story, and leaves the `lg` layout unchanged.

### 3.6 Sink specimens are deliberately not operable

Some fragments demo a CSS state with no trigger and no tab stop:
`sink/list-box.html`'s `<div>` field, `sink/menu.html`'s densities. Copying one
expecting a working control gives you a picture of a control.

A module claims a component by its **interactive element**, never by the root
class. If you copied a root class and no button, no module will attach.

### 3.7 An inactive container must not hide focusable children

`aria-hidden="true"` on an inactive container that still holds focusable buttons
leaves keyboard users tabbing into a region announced as absent. Carbon pairs
hiding with disabling; do the same.

`check-a11y` catches it, but **only if you run it on your page**. See §5.

### 3.8 An overflow menu can cover its own trigger

No gate reads occlusion. Open the menu and look.

### 3.9 Type utility classes exist — use them for group headings

`rux--type-*` covers Carbon's type scale (`heading-compact-01`, `body-01`,
`productive-heading-03` and the rest), plus weights and `type-italic`.

Use one on a group name. A bare `<legend>` renders at `12px / 400`, the same as
a text-input label beside it, so the group name reads as a label for one field.
With `rux--type-heading-compact-01` it measures `14px / 600`.

**Keep the `<legend>`**: it keeps the fieldset's accessible grouping, and an
`<h2>` does not. Add the class; do not swap the element.

**The colour stays secondary.** `rux--label` sets `--rux-text-secondary`, no
type utility carries colour, and no text-colour utility is compiled. So the group
name is heavier and larger than its rows but greyer. Do not invent a colour class.

**`sink/*.html` keeps its legends bare on purpose**, because Carbon's captures
do. The sink shows Carbon's markup; this section is about composing a page.

### 3.10 An unattested composition inherits no spacing, and there may be no fix

A `rux--tag` inline after text inside a `rux--list__item` gets a **word space,
4px**, and nothing more: neither class has a margin, and no Carbon capture pairs
the two.

**The general rule:** two components in an arrangement Carbon does not ship get
correct classes and whatever spacing normal flow produces, and **no gate reads
it**, because the gap belongs to neither classed element.

> **`stack-horizontal` looks like the fix and is not.** It gives 8px but cannot
> wrap, so in a narrow column it squeezes the tag and truncates the status text.
> Left inline, the tag wraps onto its own line and stays legible. On the `li`
> itself it also drops `display: list-item`. A wrappable inline gap needs CSS,
> and no Carbon utility provides one.

`stack-vertical` on the `<ol>` **is** safe: it is row flow so it squeezes
nothing, and an ordered list's numbers are a `::before` counter, so they survive
`display: grid`. 4px between rows.

### 3.11 An ordered list's numbers render outside its own box

`.rux--list--ordered` gets Carbon's `component-reset`
(`margin-inline-start: 0`) while its counter is
`position: absolute; inset-inline-start: -24px`. The numbers sit **24px left of
the list's content box, by design.**

Carbon gives the start margin to `.rux--list--unordered` only. An ordered list
expects a padded container; `sink/list.html` gets it from `.ks-sec`. At the top
of a `rux--css-grid-column`, which has none, the numbers escape into the page
gutter. Nothing is red.

### 3.12 There is no responsive metric-row idiom

`templates/dashboard-page.html` carries a four-tile metric row, but it is
fixed-width. No template or sink fragment shows one that reflows; the source for
that shape is `elements-grid--subgrid` in `data/carbon-react-dom.json`.

### 3.13 Pagination silently drops half its controls below 42rem

`.rux--pagination` sets `container-type: inline-size`, and
`@container pagination (max-width: 42rem)` hides `pagination__text` and every
`> .rux--form-item`. **Under 672px the page-size select, the page-number select
and both text labels vanish**, leaving the range and two arrows.

No template shows this: `table-page.html` has the only pagination, at full
width. Put pagination in a narrower column (beside a filter panel, in a split
view, inside a modal) and check it at your narrowest breakpoint. This is Carbon's
own responsive behaviour, not a defect.

### 3.14 A toast has no region, so the app writes one

Design compiles the toast card and nothing about where it sits: `@carbon/styles`
ships no `position`, `inset`, `z-index` or stacking rule for it, and there can be
no `rux--toast-region`, because every `rux--` class comes from Carbon. So an app
that shows toasts writes the region itself, under its own prefix, with every value
a `--rux-*` token. Keep the shape the same in every app: toasts sit at the top
right, stack with `--rux-spacing-03` between them, and the newest is on top. The
corner is a default. The scheduler puts its toasts bottom right, because Carbon's
corner lands on its toolbar buttons. The fixed position, the gutter, the z-index
and a narrow-width rule, so an 18rem card does not decide a 375px layout, are the
app's.

## 4. Where IBM's own guidance fits

`carbon-website/` is gitignored and on disk: *read from, never shipped.* Its
pattern pages under `carbon-website/src/pages/patterns/` cover empty states, forms, dialogs,
notifications, filtering, global header, login, loading, search, and disabled and
read-only states. They are good on anatomy and when-to-use, which the component
reference cannot answer. `templates/empty-state.html` follows its empty-states
pattern.

**Two limits.**

**It assumes all of Carbon.** Read every pattern against `docs/inventory.md`
before following it; a pattern built on `page-header` describes something that
is not here.

**Take facts and decisions, not prose.** This repository is **public**, and its
`NOTICE` covers Carbon's Apache-2.0 *code*: the compiled CSS and the icon path
data. Website guidance is under a different licence. Record what it establishes
and cite it; do not paste paragraphs.

**It does not replace the captures.** For *markup*, `data/carbon-*.json` is the
reference, matching the compiled version and needing no network;
`node tools/diff-fragment.mjs <name>` compares against it. The website says what
a pattern should do; the captures say what the markup is.

---

## 5. Verify by opening the page

**The gates cannot see everything, so looking is not optional.** Defects that
passed every gate include chevrons rotated from the wrong base glyph, missing
wrappers, and menu specimens that were `visibility: hidden`.

Run the browser gates against **your page**, not only the sink. `check-a11y`,
`check-runtime-classes` and `check-spacing` take **no page argument**: they read
whatever document they are evaluated in, so load your page and run the tool
there. Fetch it from the server rather than pasting, so the file on disk is what
runs.

`check-rendered` cannot be pointed at an arbitrary page: its unit is the
`.ks-sec` section no template has, and it throws. `check-behaviour` can: it
scopes each case to the sink section where one exists and to the document where
not, and reports a component the page lacks as **skipped**. Read it on your page
as a diagnostic; the required coverage is still the sink's.

`docs/verifying-templates.md` covers behaviour: a template's behaviour is
verified against a **running Carbon page**, never derived from `css/rux.css`,
because the stylesheet gives the mechanism and not the intent.

---

## What this does not cover

- **No content or writing guidance.** `carbon-website/src/pages/guidelines/content`
  exists and has not been read for this.
- **Theming is one attribute.** `data-theme` on `<html>` is `white`, `g10`,
  `g90`, `g100` or `rux`, and the shell zone keeps its own; the head comment in
  `templates/app-shell.html` says why it is g100. Every template links
  `css/rux-theme.css` and `css/rux-overrides.css` after `rux.css`, in that order;
  which change goes in which is the repository's `AGENTS.md`, "What must not be
  invented".
- **Little on responsive behaviour** beyond 3.2, 3.12 and 3.13.
- **This document is unenforced.** No gate reads it. Verify a claim here before
  relying on it.
