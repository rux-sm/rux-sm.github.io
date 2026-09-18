---
type: reference
---

# Choices a project makes

What can be picked when a page is started, and where each option comes from.
**Every option here is attested**: a template or a sink fragment renders it,
diffed against a Carbon capture. Nothing is offered that the gates would refuse.

Two layers offer them:

| Layer | Offers |
|---|---|
| **Builder** `builder.html` | a template, its answers, marked blocks from `sink/` and `templates/`, a live preview, and the HTML to take away. A new app starts from its download. |
| **Skill** `design-page` | composition: which shell parts, which fields, which buttons, which blocks; then the gates |

## Page shape — pick one

Each is a complete page with the shell. Start from the one nearest the job;
the second column is the suggestion.

| Template | Use it when |
|---|---|
| `app-shell` | nav and header, nothing else yet |
| `dashboard-page` | a few numbers and a table, read more than edited |
| `table-page` | a list of records: sort, select, page |
| `form-page` | create or edit one record |
| `detail-page` | read one record, with actions |
| `document-page` | read one record top to bottom, in order |
| `search-results-page` | a query, facets that narrow it, and what came back |
| `settings-page` | grouped controls that save |
| `wizard-page` | one step of a multi-step flow |
| `schedule-page` | dates and times |
| `empty-state` | nothing to show yet |
| `error-state` | something failed |

## UI shell — one, with parts

Carbon ships one shell and Design carries one attested build of it: a dark
header with the product name, header nav links, global actions, two
right-hand header panels (**the switcher** and **the account panel**) and a
left side nav, expanded, fixed. Two things are choices and four are not:

- **Header nav links**: present or absent.
- **Global actions and the switcher panel**: present or absent. Two actions
  ship, in Carbon's prescribed order: the switcher, where an ecosystem lists
  its apps, and the account. Notifications and help are not among them: an
  icon-only button with no handler is an affordance that lies. Add one in a
  product when it does something.
- Side nav: only the expanded, fixed variant is captured. No rail, no
  collapsed-by-default; ask before offering one.
- The account panel: every app has one. It holds the profile
  (a display name and the theme), saved in the browser under one key every
  app on the origin shares, so a choice made in one app is the choice in all.
  `js/theme.js` applies it before first paint, `js/profile.js` keeps it.
- The shell's theme: the header is `g100` by Carbon's own guidance under
  Carbon's four. A theme above those four is the page's own, so the shell
  takes it too, on that theme's `layer-01`.
- The mark: it is the brand, not a choice.

## Theme — five, all offered, one the default

`white`, `g10`, `g90`, `g100` from Carbon, and `rux`, the block in
`css/rux-theme.css`, the same theme in every app. Every page offers all five
in its account panel and a visitor's choice wins; what a project chooses is
the DEFAULT, on `<html>`. Suggestion: `white` or `g10` for a page read at
length, `g10` when cards should stand off the page, `g90` or `g100` for a
dark tool.

## Grid width — capped or full

Carbon's grid caps content at 99rem (1584px) and centres it: a reading
width, right for prose and forms, and the default on every template. Its
own `--full-width` modifier lifts the cap, and is the choice for a page that
is scanned rather than read, such as a board or a wide table. Attested by
`elements-grid--full-width` and `sink/grid.html`. Below 99rem the two are
identical. Suggestion: `capped` unless the page's main thing is wider than a
paragraph. It is one class on the page's outer grid.

## Fields — regular or fluid

Ten controls exist in both styles: text input, text area, select, number
input, search, date picker, time picker, and the list-box three — dropdown,
combo box and multi-select. Fluid packs the label inside the field's box so
a dense form aligns; regular keeps the label above and is what every other
control matches. Suggestion: regular unless the whole form is fluid, since
Carbon does not mix them in one group. Only checkbox, radio and toggle have
no fluid form.

A list-box control takes fluid on its wrapper, `rux--list-box__wrapper--fluid`,
rather than a `--fluid` class of its own, which is why it reads as missing.

## Buttons — kinds, sizes, states

- **Kinds**, seven: primary, secondary, tertiary, ghost, danger, danger
  tertiary, danger ghost. Suggestion: one primary per view, secondary beside
  it, ghost for the quiet action, danger only for the destructive one.
- **Sizes**, five: `xs` `sm` `md` `lg` `xl`, and `lg` is the default with no
  size class. Every template button is bare `lg`, the one toolbar
  (`table-page`) included. Carbon's own guidance, unattested here, is
  "sm inside tables and toolbars" and `xl` only for a hero action.
  `expressive` is a type-scale variant, not a size.
- **States**: disabled, loading, selected. The page sets them; they are not
  choices made at creation.

## Data tables — five row densities

- **Densities**, five: `xs` `sm` `md` `lg` `xl`, written as
  `rux--data-table--<size>` on the `<table>` itself, never on a wrapper. All
  five are attested in Carbon's captures and demoed in `sink/table.html`.
  `lg` is the default: every table here uses it, and `.rux--data-table tr` is
  already 3rem without a density class. Suggestion: `lg` for a table people
  read a row at a time, `sm` or `xs` to see many rows at once, `xl` only where
  a row holds two lines.
- **A row will not shrink below what it holds.** A selection column's checkbox
  floors every row at 41px, so `xs` and `sm` look identical there. Pick density
  for a table you have looked at.
- **The toolbar does not shrink with the table.** Carbon pairs a small table
  with `cds--table-toolbar--sm`, which is not compiled here.

## Content blocks

Anything in `sink/` can be dropped into a page body; the kitchen sink is the
catalogue and `sink/ORDER` the index. The skill offers every fragment by name.
The builder offers only what carries a `BLOCK:BEGIN` marker, plus every
REPLACE region of a template's `<main>`, because a whole fragment brings `ks-`
wrappers that `css/rux.css` does not style and specimens a page does not want.
`builder/blocks.json` is the list, and `tools/check-blocks.mjs` keeps it a
verbatim copy of its sources.

## Where a block may go — evidence, not permission

**Nothing refuses a block.** The builder offers every block in every slot
(`builder/page.mjs`). It sorts and labels them, so the reader can tell one kind
of choice from another:

| | |
|---|---|
| **An attested placement** | a block in **its own source slot**. `templates/detail-page/metric-row` in `detail-page/body`, and nowhere else. |
| **The same recorded layout** | a slot whose enclosing grid, grid column and stack classes are identical to the ones the block was marked in. **Evidence about a placement, never a verdict on one.** |

A `sink/` block matches no slot, because a sink fragment has no grid ancestry to
record.

**The grid is part of the signature.** `form-page` opens
`<div class="rux--css-grid">` and `wizard-page` opens
`<div class="rux--css-grid rux--css-grid--with-row-gap">`; their columns and
stacks are identical, and comparing only those would match blocks between them
that do not fit.

**What the comparison cannot see:** layer, siblings, what sits above in the same
stack, the frame, the theme, and the traps in `docs/composing-pages.md` §3.
§3.1 is the example: a `rux--tile` inside `layer-two` is invisible on a plain
page, and no class signature sees it. §3.10 is the general rule: an unattested
composition inherits no spacing, there may be no fix, and no gate reads it.

So a matching layout means the repository has *seen* an arrangement like this
one, not that this one works. `builder/guide.json`'s `reviewed` field records
whether rux has read a suggestion.
